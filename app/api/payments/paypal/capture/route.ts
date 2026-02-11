import { NextResponse } from "next/server";
import { capturePayPalOrder } from "@/lib/paypal";
import { prisma } from "@/lib/prisma";

type PayPalCapturePayload = {
  purchase_units?: Array<{ payments?: { captures?: Array<{ id?: string }> } }>;
};

type PurchaseWithCourse = {
  id: string;
  userId: string;
  courseId: string;
  status: string;
  amountCents: number;
  currency: string;
  createdAt: Date;
  Course: {
    title: string;
    slug: string;
    description: string | null;
    inventory: number | null;
  };
};

function getCaptureId(payload: unknown) {
  const data = payload as PayPalCapturePayload | null;
  return data?.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;
}

function getBaseUrl(requestUrl: URL): string {
  // Use NEXTAUTH_URL if available (preferred)
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  
  // Otherwise, construct from request URL but ensure HTTP for localhost
  const origin = requestUrl.origin;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return origin.replace('https://', 'http://');
  }
  
  return origin;
}

function generateInvoiceNumber(purchaseId: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const suffix = purchaseId.slice(-8).toUpperCase();
  return `INV-${year}${month}${day}-${suffix}`;
}

function formatPaymentMethod(provider: string | undefined): string {
  if (!provider) return "PayPal";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = getBaseUrl(url);
  const orderId = url.searchParams.get("token");
  const purchaseIdsParam = url.searchParams.get("purchases");

  if (!orderId) {
    return NextResponse.redirect(new URL("/courses", baseUrl));
  }

  // Handle multiple purchases (learning path enrollment)
  if (purchaseIdsParam) {
    const purchaseIds = purchaseIdsParam.split(",");
    const purchases = (await prisma.purchase.findMany({
      where: {
        id: { in: purchaseIds },
        providerRef: orderId,
      },
      include: { Course: true },    })) as PurchaseWithCourse[];

    if (purchases.length === 0) {
      return NextResponse.redirect(new URL("/courses", baseUrl));
    }

    const capture = await capturePayPalOrder(orderId);

    if (capture?.status !== "COMPLETED") {
      const user = await prisma.user.findUnique({
        where: { id: purchases[0].userId },
        select: { email: true },
      });

      if (user) {
        try {
          const { sendPurchaseFailedEmail } = await import("@/lib/email");
          await sendPurchaseFailedEmail(
            user.email,
            "Learning Path",
            "Payment capture failed"
          );
        } catch (error) {
          console.error("Failed to send failure email:", error);
        }
      }

      return NextResponse.redirect(
        new URL(`/learning-paths?checkout=failed`, baseUrl)
      );
    }

    // Process all purchases
    await Promise.all(
      purchases.map(async (purchase) => {
        if (purchase.status !== "paid") {
          await prisma.purchase.update({
            where: { id: purchase.id },
            data: { status: "paid" },
          });

          // Decrement inventory if course has limited inventory
          if (purchase.Course.inventory !== null) {
            await prisma.course.update({
              where: { id: purchase.courseId },
              data: {
                inventory: {
                  decrement: 1,
                },
              },
            });
          }

    await prisma.enrollment.upsert({
            where: {
              userId_courseId: {
                userId: purchase.userId,
                courseId: purchase.courseId,
              },
            },
            update: { purchaseId: purchase.id },
            create: {
              id: `enrollment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              userId: purchase.userId,
              courseId: purchase.courseId,
              purchaseId: purchase.id,
            },
          });

          await prisma.payment.create({
            data: {
              id: `payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              userId: purchase.userId,
              purchaseId: purchase.id,
              provider: "paypal",
              providerRef: getCaptureId(capture) ?? orderId,
              amountCents: purchase.amountCents,
              currency: purchase.currency,
              status: "paid",
            },
          });

          await prisma.activityLog.create({
            data: {
              id: `activity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              userId: purchase.userId,
              type: "purchase_completed",
              metadata: {
                purchaseId: purchase.id,
                courseId: purchase.courseId,
                courseTitle: purchase.Course.title,
                courseSlug: purchase.Course.slug,
              },
            },
          });

          try {
            const { trackPurchase } = await import("@/lib/analytics");
            trackPurchase(purchase.courseId, purchase.amountCents, purchase.userId);
          } catch (error) {
            console.error("Failed to track purchase analytics:", error);
          }
        }
      })
    );

    // Fetch payment for invoice
    const payment = await prisma.payment.findFirst({
      where: { purchaseId: purchases[0].id },
      orderBy: { createdAt: "desc" },
    });

    // Send email notifications
    const user = await prisma.user.findUnique({
      where: { id: purchases[0].userId },
      select: { email: true, name: true },
    });

    if (user) {
      try {
        const { sendPurchaseConfirmationEmail, sendEnrollmentEmail, sendInvoiceEmail } = await import("@/lib/email");
        const courseTitles = purchases.map((p) => p.Course.title).join(", ");
        const totalAmount = purchases.reduce((sum: number, p) => sum + p.amountCents, 0);
        const invoiceNumber = generateInvoiceNumber(purchases[0].id);
        const purchaseDate = payment?.createdAt || purchases[0].createdAt;
        
        await Promise.all([
          sendPurchaseConfirmationEmail(user.email, courseTitles, totalAmount),
          ...purchases.map((p) => sendEnrollmentEmail(user.email, p.Course.title)),
          sendInvoiceEmail(
            user.email,
            user.name || "Customer",
            invoiceNumber,
            purchaseDate,
            purchases.map((p) => ({
              title: p.Course.title,
              description: p.Course.description || undefined,
              amountCents: p.amountCents,
              currency: p.currency,
            })),
            formatPaymentMethod(payment?.provider),
            payment?.providerRef || undefined
          ),
        ]);
      } catch (error) {
        console.error("Failed to send email notifications:", error);
      }
    }

    // Redirect to success page with invoice
    const purchasesQuery = purchaseIds.join(",");
    return NextResponse.redirect(
      new URL(`/purchase/success?purchases=${encodeURIComponent(purchasesQuery)}`, baseUrl)
    );
  }

  // Single purchase (existing flow)
  const purchase = await prisma.purchase.findFirst({
    where: { providerRef: orderId },
    include: { Course: true },
  });

  if (!purchase) {
    return NextResponse.redirect(new URL("/courses", baseUrl));
  }

  if (purchase.status !== "paid") {
    const capture = await capturePayPalOrder(orderId);

    if (capture?.status !== "COMPLETED") {
      // Send failure email if user exists
      const user = await prisma.user.findUnique({
        where: { id: purchase.userId },
        select: { email: true },
      });

      if (user && purchase.Course) {
        try {
          const { sendPurchaseFailedEmail } = await import("@/lib/email");
          await sendPurchaseFailedEmail(
            user.email,
            purchase.Course.title,
            "Payment capture failed"
          );
        } catch (error) {
          console.error("Failed to send failure email:", error);
        }
      }

      return NextResponse.redirect(
        new URL(`/courses/${purchase.Course.slug}?checkout=failed`, baseUrl)
      );
    }

    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { status: "paid" },
    });

    // Decrement inventory if course has limited inventory
    if (purchase.Course.inventory !== null) {
      await prisma.course.update({
        where: { id: purchase.courseId },
        data: {
          inventory: {
            decrement: 1,
          },
        },
      });
    }    await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: purchase.userId,
          courseId: purchase.courseId,
        },
      },
      update: { purchaseId: purchase.id },
      create: {
        id: `enrollment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: purchase.userId,
        courseId: purchase.courseId,
        purchaseId: purchase.id,
      },
    });

    // Fetch payment for invoice
    const payment = await prisma.payment.findFirst({
      where: { purchaseId: purchase.id },
      orderBy: { createdAt: "desc" },
    });

    // Send email notifications
    const user = await prisma.user.findUnique({
      where: { id: purchase.userId },
      select: { email: true, name: true },
    });

    if (user && purchase.Course) {
      try {
        const { sendPurchaseConfirmationEmail, sendEnrollmentEmail, sendInvoiceEmail } = await import("@/lib/email");
        const invoiceNumber = generateInvoiceNumber(purchase.id);
        const purchaseDate = payment?.createdAt || purchase.createdAt;
        
        await Promise.all([
          sendPurchaseConfirmationEmail(user.email, purchase.Course.title, purchase.amountCents),
          sendEnrollmentEmail(user.email, purchase.Course.title),
          sendInvoiceEmail(
            user.email,
            user.name || "Customer",
            invoiceNumber,
            purchaseDate,
            [{
              title: purchase.Course.title,
              description: purchase.Course.description || undefined,
              amountCents: purchase.amountCents,
              currency: purchase.currency,
            }],
            formatPaymentMethod(payment?.provider),
            payment?.providerRef || undefined
          ),
        ]);
      } catch (error) {
        console.error("Failed to send email notifications:", error);
        // Don't fail the capture if email fails
      }
    }

    await prisma.payment.create({
      data: {
        id: `payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: purchase.userId,
        purchaseId: purchase.id,
        provider: "paypal",
        providerRef: getCaptureId(capture) ?? orderId,
        amountCents: purchase.amountCents,
        currency: purchase.currency,
        status: "paid",
      },
    });

    await prisma.activityLog.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: purchase.userId,
        type: "purchase_completed",
        metadata: {
          purchaseId: purchase.id,
          courseId: purchase.courseId,
          courseTitle: purchase.Course.title,
          courseSlug: purchase.Course.slug,
        },
      },
    });

    // Track analytics
    try {
      const { trackPurchase } = await import("@/lib/analytics");
      trackPurchase(purchase.courseId, purchase.amountCents, purchase.userId);
    } catch (error) {
      console.error("Failed to track purchase analytics:", error);
    }
  }

  // Redirect to success page with invoice
  return NextResponse.redirect(
    new URL(`/purchase/success?purchase=${encodeURIComponent(purchase.id)}`, baseUrl)
  );
}
