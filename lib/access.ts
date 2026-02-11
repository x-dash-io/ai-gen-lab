import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, withRetry } from "@/lib/prisma";
import { hasRole, type Role } from "@/lib/rbac";
import { getUserSubscription } from "@/lib/subscriptions";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  // Return user with proper typing - the session type extensions should include id and role
  return session.user;
}

export async function requireRole(requiredRole: Role) {
  const user = await requireUser();
  if (!hasRole(user.role, requiredRole)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export function isAdmin(role: Role) {
  return role === "admin";
}

/**
 * Require that the user is a customer (not an admin)
 * Admins should not perform customer operations like purchasing, reviewing, etc.
 */
export async function requireCustomer() {
  const user = await requireUser();
  if (isAdmin(user.role)) {
    throw new Error("FORBIDDEN: This operation is for customers only");
  }
  return user;
}

export async function hasPurchasedCourse(userId: string, courseId: string) {
  const purchase = await withRetry(async () => {
    return prisma.purchase.findFirst({
      where: {
        userId,
        courseId,
        status: "paid",
      },
      select: { id: true },
    });
  });

  return Boolean(purchase);
}

export async function hasCourseAccess(
  userId: string,
  role: Role,
  courseId: string
) {
  if (isAdmin(role)) {
    return true;
  }

  // Check individual purchase
  const purchased = await hasPurchasedCourse(userId, courseId);
  if (purchased) return true;

  // Check subscription
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { tier: true },
  });

  if (!course) return false;

  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;

  // Access rules:
  // - Starter: STANDARD courses
  // - Professional: STANDARD + PREMIUM courses
  // - Founder: STANDARD + PREMIUM courses
  if (course.tier === "STANDARD") {
    return true; // Any active subscription gives access to Standard
  }

  if (course.tier === "PREMIUM") {
    return (
      subscription.plan.tier === "professional" || subscription.plan.tier === "founder"
    );
  }

  return false;
}
