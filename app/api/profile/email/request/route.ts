import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { createCustomRateLimit } from "@/lib/rate-limit";
import { storeVerificationCode, generateVerificationCode } from "@/lib/email-verification";

const requestSchema = z.object({
  newEmail: z.string().email("Invalid email address"),
});

// Rate limit: 3 requests per hour
const emailChangeRateLimit = createCustomRateLimit("email-change", 3, 3600);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const identifier = session.user.id;
    const { allowed } = await emailChangeRateLimit(identifier);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { newEmail } = requestSchema.parse(body);

    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "This email is already in use" },
        { status: 400 }
      );
    }

    // Generate 6-digit code
    const code = generateVerificationCode();

    // Store code (expires in 15 minutes)
    storeVerificationCode(session.user.id, code, newEmail, 15);

    // Send verification email
    await sendEmail({
      to: newEmail,
      subject: "Verify Your New Email Address - AI Genius Lab",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">
            Verify Your New Email Address
          </h2>
          
          <p style="color: #333; line-height: 1.6;">
            You requested to change your email address on AI Genius Lab.
          </p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="color: #666; margin: 0 0 10px 0;">Your verification code is:</p>
            <h1 style="color: #f59e0b; font-size: 36px; letter-spacing: 8px; margin: 10px 0;">
              ${code}
            </h1>
            <p style="color: #666; margin: 10px 0 0 0; font-size: 14px;">
              This code expires in 15 minutes
            </p>
          </div>
          
          <p style="color: #333; line-height: 1.6;">
            Enter this code on the profile page to complete your email change.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p>If you didn't request this change, please ignore this email and your email address will remain unchanged.</p>
            <p>For security reasons, this code will expire in 15 minutes.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json(
      { success: true, message: "Verification code sent" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email change request error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
