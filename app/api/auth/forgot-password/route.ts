import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimits } from "@/lib/rate-limit";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  // Rate limiting: 5 password reset attempts per 15 minutes per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? 
             request.headers.get("x-real-ip") ?? 
             "anonymous";
  const rateLimit = await rateLimits.auth(ip);
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { 
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        }
      }
    );
  }

  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Don't reveal if user exists or not (security best practice)
    if (!user || !user.passwordHash) {
      // Return success even if user doesn't exist to prevent email enumeration
      return NextResponse.json({ success: true });
    }

    // Generate 6-digit reset code
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15); // Code expires in 15 minutes

    // Store code in VerificationToken table
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: email.toLowerCase().trim(),
          token: resetCode,
        },
      },
      update: {
        token: resetCode,
        expires,
      },
      create: {
        identifier: email.toLowerCase().trim(),
        token: resetCode,
        expires,
      },
    });

    // Send password reset email with code
    try {
      await sendPasswordResetEmail(user.email, resetCode);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      // In development, log the code for testing when email fails
      if (process.env.NODE_ENV === "development") {
        console.log(`[DEV] Password reset code for ${user.email}: ${resetCode}`);
        console.log("[DEV] Note: Resend test domain only allows sending to account owner's email");
        console.log("[DEV] Use this code to test the reset flow manually");
      }
      // Don't fail the request if email fails (security best practice)
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
