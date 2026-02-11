import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getVerificationCode, deleteVerificationCode } from "@/lib/email-verification";

const verifySchema = z.object({
  newEmail: z.string().email("Invalid email address"),
  code: z.string().length(6, "Code must be 6 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { newEmail, code } = verifySchema.parse(body);

    // Get stored verification data
    const stored = getVerificationCode(session.user.id);

    if (!stored) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if expired
    if (Date.now() > stored.expires) {
      deleteVerificationCode(session.user.id);
      return NextResponse.json(
        { error: "Verification code expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if email matches
    if (stored.email !== newEmail) {
      return NextResponse.json(
        { error: "Email mismatch. Please request a new code." },
        { status: 400 }
      );
    }

    // Check if code matches
    if (stored.code !== code) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Check if email is still available
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser) {
      deleteVerificationCode(session.user.id);
      return NextResponse.json(
        { error: "This email is already in use" },
        { status: 400 }
      );
    }

    // Update email
    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        email: newEmail,
        emailVerified: new Date(), // Mark as verified
      },
    });

    // Clean up verification code
    deleteVerificationCode(session.user.id);

    return NextResponse.json(
      { success: true, message: "Email updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email verification error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
