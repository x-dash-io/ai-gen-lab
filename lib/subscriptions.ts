import { prisma } from "@/lib/prisma";
import {
  createPayPalProduct,
  createPayPalPlan,
  cancelPayPalSubscription,
  getPayPalSubscription
} from "@/lib/paypal";
import { Prisma, SubscriptionTier, SubscriptionStatus, SubscriptionInterval } from "@prisma/client";
import { assertSubscriptionTransition } from "@/lib/subscription-state";

/**
 * Sync all active subscription plans from the database to PayPal.
 */
export async function syncSubscriptionPlansToPayPal() {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true }
  });

  if (plans.length === 0) {
    return { success: true, count: 0, message: "No active plans to sync." };
  }

  let syncedCount = 0;
  const errorMessages: string[] = [];

  for (const plan of plans) {
    try {
      let productId = plan.paypalProductId;

      // 1. Ensure Product exists in PayPal
      if (!productId) {
        const product = await createPayPalProduct({
          name: `AI Genius Lab - ${plan.name}`,
          description: plan.description || `Subscription for ${plan.name} tier`,
        });

        await prisma.subscriptionPlan.update({
          where: { id: plan.id },
          data: { paypalProductId: product.id }
        });
        productId = product.id;
      }

      // 2. Ensure Monthly Plan exists
      if (!plan.paypalMonthlyPlanId && plan.priceMonthlyCents > 0) {
        const payPalPlan = await createPayPalPlan({
          productId: productId!,
          name: `${plan.name} Monthly`,
          description: `Monthly subscription for ${plan.name}`,
          priceCents: plan.priceMonthlyCents,
          intervalUnit: "MONTH",
        });

        await prisma.subscriptionPlan.update({
          where: { id: plan.id },
          data: { paypalMonthlyPlanId: payPalPlan.id }
        });
      }

      // 3. Ensure Annual Plan exists
      if (!plan.paypalAnnualPlanId && plan.priceAnnualCents > 0) {
        const payPalPlan = await createPayPalPlan({
          productId: productId!,
          name: `${plan.name} Annual`,
          description: `Annual subscription for ${plan.name}`,
          priceCents: plan.priceAnnualCents,
          intervalUnit: "YEAR",
        });

        await prisma.subscriptionPlan.update({
          where: { id: plan.id },
          data: { paypalAnnualPlanId: payPalPlan.id }
        });
      }
      syncedCount++;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const msg = `Failed to sync plan ${plan.name}: ${message}`;
      console.error(msg);
      errorMessages.push(msg);
    }
  }

  return {
    success: errorMessages.length === 0,
    count: syncedCount,
    errors: errorMessages,
  };
}

/**
 * Get the current active subscription for a user.
 * FIXED: Prioritizes the most recently created subscription, regardless of whether 
 * it is Active, Cancelled, or Pending. This ensures upgrades are detected immediately.
 */
export async function getUserSubscription(userId: string) {
  // Query for ANY valid or potentially valid subscription
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      OR: [
        // Case 1: Active, Cancelled, or Past Due (must have future end date)
        {
          status: { in: ["active", "cancelled", "past_due"] },
          currentPeriodEnd: { gt: new Date() }
        },
        // Case 2: Pending (created in last 24h)
        {
          status: "pending",
          createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      ]
    },
    include: { plan: true },
    // Crucial: Get the NEWEST one first. 
    // This ensures a new Pending/Active plan overrides an old Cancelled one.
    orderBy: { createdAt: "desc" }
  });

  if (!subscription) return null;

  // If the newest subscription is pending, try to auto-refresh it
  if (subscription.status === "pending") {
    return await refreshSubscriptionStatus(subscription.id);
  }

  return subscription;
}

/**
 * Sync a subscription's status with PayPal.
 * Useful for "pending" subscriptions to check if they've been activated.
 */
export async function refreshSubscriptionStatus(subscriptionId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true }
  });

  if (!subscription || !subscription.paypalSubscriptionId || subscription.status !== "pending") {
    return subscription;
  }

  try {
    const paypalSub = await getPayPalSubscription(subscription.paypalSubscriptionId);

    if (paypalSub.status === "ACTIVE") {
      const startTime = new Date(paypalSub.start_time || Date.now());
      const endTime = paypalSub.billing_info?.next_billing_time
        ? new Date(paypalSub.billing_info.next_billing_time)
        : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000); // Fallback to 31 days

      const updatedSub = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: "active",
          currentPeriodStart: startTime,
          currentPeriodEnd: endTime,
        },
        include: { plan: true }
      });
      return updatedSub;
    }
  } catch (error) {
    console.error(`Failed to refresh subscription ${subscriptionId}:`, error);
  }

  return subscription;
}

/**
 * Order of subscription tiers from lowest to highest.
 * Used for comparison logic.
 */
export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  SubscriptionTier.starter,
  SubscriptionTier.professional,
  SubscriptionTier.founder,
];

/**
 * Get the display name of a user's current subscription plan.
 * Defaults to "Starter" if no active subscription is found.
 */
export async function getUserPlanDisplayName(userId: string): Promise<string> {
  const subscription = await getUserSubscription(userId);

  if (!subscription || !["active", "cancelled", "past_due"].includes(subscription.status)) {
    return "Starter";
  }

  return subscription.plan.name;
}

/**
 * Check if a user has an active subscription of at least a certain tier.
 */
export async function hasSubscriptionTier(userId: string, requiredTier: SubscriptionTier) {
  const subscription = await getUserSubscription(userId);
  if (!subscription || !["active", "cancelled", "past_due"].includes(subscription.status)) {
    return false;
  }

  const userTierIndex = SUBSCRIPTION_TIERS.indexOf(subscription.plan.tier);
  const requiredTierIndex = SUBSCRIPTION_TIERS.indexOf(requiredTier);

  return userTierIndex >= requiredTierIndex;
}

/**
 * Update a subscription with new resource data (usually from PayPal).
 * Handles extending the period and syncing the plan.
 */
export async function updateSubscription(subscriptionId: string, data: {
  status: SubscriptionStatus;
  paypalSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  paypalPlanId?: string;
}) {
  const current = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });

  if (!current) {
    throw new Error("Subscription not found");
  }

  assertSubscriptionTransition(current.status, data.status);

  const updateData: Prisma.SubscriptionUpdateInput = {
    status: data.status,
    paypalSubscriptionId: data.paypalSubscriptionId,
    currentPeriodStart: data.currentPeriodStart,
    currentPeriodEnd: data.currentPeriodEnd,
  };

  // If a plan ID is provided, try to find and sync our local plan record
  if (data.paypalPlanId) {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: {
        OR: [
          { paypalMonthlyPlanId: data.paypalPlanId },
          { paypalAnnualPlanId: data.paypalPlanId }
        ]
      }
    });

    if (plan) {
      updateData.plan = { connect: { id: plan.id } };
      updateData.interval = plan.paypalAnnualPlanId === data.paypalPlanId ? "annual" : "monthly";
    }
  }

  return await prisma.subscription.update({
    where: { id: subscriptionId },
    data: updateData,
    include: { plan: true }
  });
}

/**
 * Cancel a user's subscription.
 * This marks it as cancelled in our DB and calls PayPal to stop future billing.
 */
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  if (subscription.paypalSubscriptionId) {
    try {
      await cancelPayPalSubscription(subscription.paypalSubscriptionId);
    } catch (error) {
      console.error("Failed to cancel PayPal subscription:", error);
      // We continue to update our DB even if PayPal fails
    }
  }

  assertSubscriptionTransition(subscription.status, "cancelled");

  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "cancelled",
      cancelAtPeriodEnd: true
    }
  });
}

/**
 * Grant a subscription manually to a user (Admin feature).
 */
export async function grantSubscriptionManually({
  userId,
  planId,
  interval,
  durationDays = 30
}: {
  userId: string;
  planId: string;
  interval: SubscriptionInterval;
  durationDays?: number;
}) {
  const now = new Date();
  const end = new Date();
  end.setDate(now.getDate() + durationDays);

  return prisma.subscription.create({
    data: {
      userId,
      planId,
      status: "active",
      interval,
      currentPeriodStart: now,
      currentPeriodEnd: end,
    }
  });
}

/**
 * Clean up abandoned pending subscriptions that are older than 24 hours.
 */
export async function cleanupAbandonedPendingSubscriptions() {
  const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const abandoned = await prisma.subscription.findMany({
    where: {
      status: "pending",
      createdAt: { lt: cutoffDate }
    }
  });

  if (abandoned.length === 0) {
    return 0;
  }

  // Mark them as expired
  await prisma.subscription.updateMany({
    where: {
      status: "pending",
      createdAt: { lt: cutoffDate }
    },
    data: {
      status: "expired"
    }
  });

  console.log(`[CLEANUP] Marked ${abandoned.length} abandoned pending subscriptions as expired`);
  return abandoned.length;
}
