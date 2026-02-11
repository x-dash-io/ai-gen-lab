import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { createCustomRateLimit } from "@/lib/rate-limit";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  subject: z.enum(["general", "course", "technical", "billing", "partnership", "other"]),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

const subjectLabels: Record<string, string> = {
  general: "General Inquiry",
  course: "Course Question",
  technical: "Technical Support",
  billing: "Billing & Payments",
  partnership: "Partnership Opportunity",
  other: "Other",
};

// Create rate limiter for contact form: 3 messages per hour
const contactRateLimit = createCustomRateLimit("contact", 3, 3600);

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 3 messages per hour per IP
    const identifier = request.headers.get("x-forwarded-for") || "anonymous";
    const { allowed, remaining } = await contactRateLimit(identifier);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validatedData = contactSchema.parse(body);

    const { name, email, subject, message } = validatedData;
    const subjectLabel = subjectLabels[subject] || "Contact Form";

    // Send email to support team
    const { siteConfig } = await import("@/lib/config");
    const supportEmail = process.env.SUPPORT_EMAIL || siteConfig.links.email;
    
    await sendEmail({
      to: supportEmail,
      subject: `[Contact Form] ${subjectLabel} - ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>From:</strong> ${name}</p>
            <p style="margin: 10px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p style="margin: 10px 0;"><strong>Subject:</strong> ${subjectLabel}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="color: #333; margin-bottom: 10px;">Message:</h3>
            <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px;">
              ${message.replace(/\n/g, "<br>")}
            </div>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p>This message was sent via the AI Genius Lab contact form.</p>
            <p>Reply directly to this email to respond to ${name}.</p>
          </div>
        </div>
      `,
    });

    // Send confirmation email to user
    await sendEmail({
      to: email,
      subject: "We received your message - AI Genius Lab",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">
            Thank You for Contacting Us
          </h2>
          
          <p style="color: #333; line-height: 1.6;">Hi ${name},</p>
          
          <p style="color: #333; line-height: 1.6;">
            We've received your message and will get back to you within 24-48 hours.
          </p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Your Message:</h3>
            <p style="margin: 10px 0;"><strong>Subject:</strong> ${subjectLabel}</p>
            <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin-top: 10px;">
              ${message.replace(/\n/g, "<br>")}
            </div>
          </div>
          
          <p style="color: #333; line-height: 1.6;">
            In the meantime, you might find answers to common questions in our 
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/faq" style="color: #f59e0b; text-decoration: none;">FAQ page</a>.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #333; margin: 0;">Best regards,</p>
            <p style="color: #333; margin: 5px 0 0 0;"><strong>AI Genius Lab Team</strong></p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p>If you didn't send this message, please ignore this email.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Message sent successfully",
        remaining,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Contact form error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid form data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}
