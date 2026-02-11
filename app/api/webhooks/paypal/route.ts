import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPayPalWebhook, getPayPalSubscription, cancelPayPalSubscription } from "@/lib/paypal";

type PayPalEvent = {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    custom_id?: string;
    start_time?: string;
    plan_id?: string;
    billing_agreement_id?: string;
    billing_info?: {
      next_billing_time?: string;
    };
    amount?: {
      total?: string;
      currency_code?: string;
    };
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
    [key: string]: unknown;
  };
};

function getOrderId(event: PayPalEvent) {
  return (
    event.resource?.supplementary_data?.related_ids?.order_id ??
    event.resource?.id ??
    null
  );
}

function getWebhookEventId(event: PayPalEvent, transmissionId: string) {
  const resourceId = event.resource?.id ?? getOrderId(event) ?? "unknown-resource";
  return event.id ?? `${event.event_type ?? "unknown-event"}:${resourceId}:${transmissionId}`;
}

async function tryRegisterWebhookEvent(event: PayPalEvent, eventId: string, transmissionId: string) {
  try {
    await prisma.webhookEvent.create({
      data: {
        provider: "paypal",
        eventId,
        eventType: event.event_type ?? "unknown",
        transmissionId,
        payload: event as Prisma.InputJsonValue,
      },
    });

    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return false;
    }

    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const bodyText = await request.text();
    const event = JSON.parse(bodyText) as PayPalEvent;

    console.log(`[WEBHOOK] PayPal event received: ${event.event_type}`);

    const transmissionId = request.headers.get("paypal-transmission-id");
    const transmissionTime = request.headers.get("paypal-transmission-time");
    const transmissionSig = request.headers.get("paypal-transmission-sig");
    const certUrl = request.headers.get("paypal-cert-url");
    const authAlgo = request.headers.get("paypal-auth-algo");

    if (
      !transmissionId ||
      !transmissionTime ||
      !transmissionSig ||
      !certUrl ||
      !authAlgo
    ) {
      console.error("[WEBHOOK] Missing PayPal headers");
      return NextResponse.json({ error: "Missing PayPal headers" }, { status: 400 });
    }

    console.log("[WEBHOOK] Verifying webhook signature...");
    const verified = await verifyPayPalWebhook({
      transmissionId,
      transmissionTime,
      transmissionSig,
      certUrl,
      authAlgo,
      webhookEvent: event,
    });

    if (!verified) {
      console.error("[WEBHOOK] Invalid signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const eventId = getWebhookEventId(event, transmissionId);
    const registered = await tryRegisterWebhookEvent(event, eventId, transmissionId);

    if (!registered) {
      console.log(`[WEBHOOK] Event ${eventId} already processed, skipping`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    console.log(`[WEBHOOK] Signature verified successfully`);
    console.log(`[WEBHOOK] Event ID: ${eventId}`);

    // Handle Subscription Events
    if (event.event_type?.startsWith("BILLING.SUBSCRIPTION.")) {
      const subscriptionResource = event.resource;
      if (!subscriptionResource) {
        console.warn("[WEBHOOK] Missing resource payload in subscription event");
        return NextResponse.json({ received: true });
      }

      let customId = subscriptionResource.custom_id;
      const paypalSubId = subscriptionResource.id;

      if (!customId && paypalSubId) {
        const subByPaypalId = await prisma.subscription.findUnique({
          where: { paypalSubscriptionId: paypalSubId },
        });
        if (subByPaypalId) {
          customId = subByPaypalId.id;
        }
      }

      if (!customId) {
        console.warn("[WEBHOOK] Missing custom_id in subscription event and could not find by PayPal ID");
        return NextResponse.json({ received: true });
      }

      switch (event.event_type) {
        case "BILLING.SUBSCRIPTION.ACTIVATED":
        case "BILLING.SUBSCRIPTION.UPDATED": {
          const startTime = new Date(subscriptionResource.start_time || Date.now());
          const endTime = subscriptionResource.billing_info?.next_billing_time
            ? new Date(subscriptionResource.billing_info.next_billing_time)
            : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);

          const { updateSubscription } = await import("@/lib/subscriptions");
          const updatedSub = await updateSubscription(customId, {
            status: "active",
            paypalSubscriptionId: paypalSubId,
            currentPeriodStart: startTime,
            currentPeriodEnd: endTime,
            paypalPlanId: subscriptionResource.plan_id,
          });

          const otherSubs = await prisma.subscription.findMany({
            where: {
              userId: updatedSub.userId,
              id: { not: updatedSub.id },
              status: { in: ["active", "cancelled", "past_due", "pending"] },
            },
          });

          for (const other of otherSubs) {
            if (other.status !== "pending" && other.paypalSubscriptionId) {
              try {
                await cancelPayPalSubscription(other.paypalSubscriptionId, "Replaced by new subscription");
              } catch (error) {
                console.error(`[WEBHOOK] Failed to cancel previous PayPal sub ${other.paypalSubscriptionId}:`, error);
              }
            }
          }

          await prisma.$transaction(async (tx) => {
            for (const other of otherSubs) {
              await tx.subscription.update({
                where: { id: other.id },
                data: { status: other.status === "pending" ? "expired" : "expired" },
              });
            }
          });

          revalidatePath("/profile/subscription");
          revalidatePath("/profile");
          revalidatePath("/pricing");
          revalidatePath("/dashboard");
          break;
        }

        case "BILLING.SUBSCRIPTION.CANCELLED": {
          const { updateSubscription } = await import("@/lib/subscriptions");
          await updateSubscription(customId, { status: "cancelled" });
          await prisma.subscription.update({
            where: { id: customId },
            data: { cancelAtPeriodEnd: true },
          });
          revalidatePath("/profile/subscription");
          revalidatePath("/profile");
          break;
        }

        case "BILLING.SUBSCRIPTION.EXPIRED":
        case "BILLING.SUBSCRIPTION.SUSPENDED": {
          const { updateSubscription } = await import("@/lib/subscriptions");
          await updateSubscription(customId, { status: "expired" });
          break;
        }
      }

      return NextResponse.json({ received: true });
    }

    // Handle Recurring Payment Completion
    if (event.event_type === "PAYMENT.SALE.COMPLETED") {
      const saleResource = event.resource;
      if (!saleResource) {
        console.warn("[WEBHOOK] Missing resource payload in PAYMENT.SALE.COMPLETED event");
        return NextResponse.json({ received: true });
      }

      const paypalSubId = saleResource.billing_agreement_id;
      const saleAmount = saleResource.amount?.total;
      const saleCurrency = saleResource.amount?.currency_code;

      if (!saleAmount || !saleCurrency) {
        console.warn("[WEBHOOK] Missing sale amount details in PAYMENT.SALE.COMPLETED event");
        return NextResponse.json({ received: true });
      }

      if (paypalSubId) {
        const sub = await prisma.subscription.findUnique({
          where: { paypalSubscriptionId: paypalSubId },
        });

        if (sub) {
          await prisma.subscriptionPayment.create({
            data: {
              subscriptionId: sub.id,
              amountCents: Math.round(parseFloat(saleAmount) * 100),
              currency: saleCurrency.toLowerCase(),
              status: "completed",
              paypalSaleId: saleResource.id,
            },
          });

          try {
            const paypalSub = await getPayPalSubscription(paypalSubId);
            const nextBillingTime = paypalSub.billing_info?.next_billing_time;
            if (nextBillingTime) {
              const { updateSubscription } = await import("@/lib/subscriptions");
              await updateSubscription(sub.id, {
                status: "active",
                currentPeriodEnd: new Date(nextBillingTime),
              });
            }
          } catch (error) {
            console.error("[WEBHOOK] Failed to refresh next billing period:", error);
          }
        }
      }

      return NextResponse.json({ received: true });
    }

    if (
      event.event_type !== "PAYMENT.CAPTURE.COMPLETED" &&
      event.event_type !== "CHECKOUT.ORDER.APPROVED"
    ) {
      return NextResponse.json({ received: true });
    }

    const orderId = getOrderId(event);
    if (!orderId) {
      return NextResponse.json({ error: "Missing order id" }, { status: 400 });
    }

    const purchases = await prisma.purchase.findMany({
      where: { providerRef: orderId },
      include: {
        Course: {
          select: {
            id: true,
            title: true,
            inventory: true,
            slug: true,
          },
        },
        User: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (purchases.length === 0) {
      return NextResponse.json({ received: true });
    }

    for (const purchase of purchases) {
      await prisma.$transaction(async (tx) => {
        const statusUpdate = await tx.purchase.updateMany({
          where: {
            id: purchase.id,
            status: { not: "paid" },
          },
          data: { status: "paid" },
        });

        if (statusUpdate.count === 0) {
          return;
        }

        if (purchase.Course && purchase.Course.inventory !== null) {
          const inventoryUpdate = await tx.course.updateMany({
            where: {
              id: purchase.courseId,
              inventory: {
                gt: 0,
              },
            },
            data: {
              inventory: {
                decrement: 1,
              },
            },
          });

          if (inventoryUpdate.count === 0) {
            throw new Error(`OUT_OF_STOCK_DURING_CAPTURE:${purchase.courseId}`);
          }
        }

        await tx.enrollment.upsert({
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

        await tx.payment.create({
          data: {
            id: `payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            userId: purchase.userId,
            purchaseId: purchase.id,
            provider: "paypal",
            providerRef: orderId,
            amountCents: purchase.amountCents,
            currency: purchase.currency,
            status: "paid",
          },
        });

        if (purchase.couponId) {
          await tx.$executeRaw`
            UPDATE "Coupon"
            SET "usedCount" = "usedCount" + 1
            WHERE "id" = ${purchase.couponId}
              AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
          `;
        }

        await tx.activityLog.create({
          data: {
            id: `activity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            userId: purchase.userId,
            type: "purchase_completed",
            metadata: {
              purchaseId: purchase.id,
              courseId: purchase.courseId,
              courseTitle: purchase.Course?.title,
            },
          },
        });
      });
    }

    const firstPurchase = purchases[0];
    if (firstPurchase.User) {
      try {
        const { sendPurchaseConfirmationEmail, sendEnrollmentEmail } = await import("@/lib/email");
        const courseTitles = purchases.map((p) => p.Course?.title || "Course").join(", ");
        const totalAmount = purchases.reduce((sum, p) => sum + p.amountCents, 0);

        await sendPurchaseConfirmationEmail(firstPurchase.User.email, courseTitles, totalAmount);

        for (const p of purchases) {
          if (p.Course?.title) {
            await sendEnrollmentEmail(firstPurchase.User.email, p.Course.title);
          }
        }
      } catch (error) {
        console.error("[WEBHOOK] Failed to send email notifications:", error);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[WEBHOOK] Critical error processing webhook:", error);
    if (error instanceof Error) {
      console.error("[WEBHOOK] Error message:", error.message);
      console.error("[WEBHOOK] Error stack:", error.stack);
    }

    return NextResponse.json({ received: false, error: "Processing failed" }, { status: 500 });
  }
}
