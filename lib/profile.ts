"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access";
import { hashPassword, verifyPassword } from "@/lib/password";

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  role: string;
  createdAt: Date;
}

export interface UserStats {
  coursesPurchased: number;
  totalSpent: number;
  lessonsCompleted: number;
  memberSince: Date;
}

/**
 * Get user profile data
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      bio: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

/**
 * Get user statistics
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const [purchases, progress, user] = await Promise.all([
    prisma.purchase.findMany({
      where: { userId, status: "paid" },
      select: { amountCents: true },
    }),
    prisma.progress.findMany({
      where: { userId },
      select: { completedAt: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    }),
  ]);

  const totalSpent = purchases.reduce(
    (sum: number, p: (typeof purchases)[number]) => sum + p.amountCents,
    0
  );
  const lessonsCompleted = progress.filter((p: (typeof progress)[number]) => p.completedAt != null).length;

  return {
    coursesPurchased: purchases.length,
    totalSpent,
    lessonsCompleted,
    memberSince: user?.createdAt || new Date(),
  };
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  data: { name?: string; bio?: string }
) {
  const user = await requireUser();
  
  if (user.id !== userId) {
    throw new Error("FORBIDDEN: You can only update your own profile");
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name !== undefined ? data.name : undefined,
      bio: data.bio !== undefined ? data.bio : undefined,
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      bio: true,
      role: true,
      createdAt: true,
    },
  });
}

/**
 * Update user avatar
 */
export async function updateUserAvatar(userId: string, imageUrl: string) {
  const user = await requireUser();
  
  if (user.id !== userId) {
    throw new Error("FORBIDDEN: You can only update your own avatar");
  }

  return prisma.user.update({
    where: { id: userId },
    data: { image: imageUrl },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      bio: true,
      role: true,
      createdAt: true,
    },
  });
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await requireUser();
  
  if (user.id !== userId) {
    throw new Error("FORBIDDEN: You can only change your own password");
  }

  // Get user with password hash
  const userWithPassword = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!userWithPassword?.passwordHash) {
    throw new Error("Password change not available for OAuth users");
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, userWithPassword.passwordHash);
  if (!isValid) {
    throw new Error("Current password is incorrect");
  }

  // Validate new password
  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters long");
  }

  // Hash and update password
  const newPasswordHash = await hashPassword(newPassword);
  
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  return { success: true };
}
