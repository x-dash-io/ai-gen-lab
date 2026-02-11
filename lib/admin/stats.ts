import { prisma } from "@/lib/prisma";

export async function getAdminStats() {
  const [
    totalCourses,
    publishedCourses,
    totalUsers,
    adminUsers,
    totalRevenue,
    monthlyRevenue,
    activeEnrollments,
    recentPurchases,
    activeSubscriptions,
  ] = await Promise.all([
    prisma.course.count(),
    prisma.course.count({ where: { isPublished: true } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "admin" } }),
    prisma.purchase.aggregate({
      where: { status: "paid" },
      _sum: { amountCents: true },
    }),
    prisma.purchase.aggregate({
      where: {
        status: "paid",
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { amountCents: true },
    }),
    prisma.enrollment.count(),
    prisma.purchase.findMany({
      where: { status: "paid" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        User: {
          select: { email: true, name: true },
        },
        Course: {
          select: { title: true, slug: true },
        },
      },
    }),
    // New: Fetch active subscriptions for MRR and Breakdown
    prisma.subscription.findMany({
      where: {
        status: "active",
      },
      include: {
        plan: true,
        user: {
          select: { role: true },
        },
      },
    }),
  ]);

  // Calculate MRR from active subscriptions
  let mrrCents = 0;
  const subscriberBreakdown = {
    free: 0,
    starter: 0,
    professional: 0,
    founder: 0,
    other: 0,
  };

  // Count paid subscribers and calculate MRR
  const activeSubscriberIds = new Set<string>();

  activeSubscriptions.forEach((sub) => {
    // Skip admins from MRR and subscription counts
    if (sub.user?.role === "admin") return;

    activeSubscriberIds.add(sub.userId);

    // MRR Calculation
    if (sub.plan.priceMonthlyCents > 0) { // Only count paid plans
      if (sub.interval === "monthly") {
        mrrCents += sub.plan.priceMonthlyCents;
      } else if (sub.interval === "annual") {
        mrrCents += Math.round(sub.plan.priceAnnualCents / 12);
      }
    }

    // Breakdown
    const tier = sub.plan.tier.toLowerCase();
    if (tier === "professional" || sub.plan.name.toLowerCase().includes("professional")) {
      subscriberBreakdown.professional++;
    } else if (tier === "founder" || sub.plan.name.toLowerCase().includes("founder")) {
      subscriberBreakdown.founder++;
    } else if (tier === "starter" || sub.plan.priceMonthlyCents === 0) {
      // If starter is tracked as a subscription but free
      // We count it as starter/free but no MRR
    } else {
      subscriberBreakdown.other++;
    }
  });

  // "Free" users are Total Users - Unique Paid Subscribers
  // Note: This assumes "Starter" users don't necessarily have a subscription record. 
  // We exclude admins from the total pool of potential free users.
  const paidSubscribersCount = subscriberBreakdown.professional + subscriberBreakdown.founder + subscriberBreakdown.other;
  // totalUsers includes admins, so we subtract adminUsers to get "Customer Pool", then subtract paid customers to get "Free Customers"
  subscriberBreakdown.free = Math.max(0, (totalUsers - adminUsers) - paidSubscribersCount);

  return {
    courses: {
      total: totalCourses,
      published: publishedCourses,
      unpublished: totalCourses - publishedCourses,
    },
    users: {
      total: totalUsers,
      admins: adminUsers,
      customers: totalUsers - adminUsers,
    },
    revenue: {
      allTime: totalRevenue._sum.amountCents || 0,
      monthly: monthlyRevenue._sum.amountCents || 0,
      mrr: mrrCents,
    },
    subscribers: subscriberBreakdown,
    enrollments: {
      active: activeEnrollments,
    },
    recentPurchases,
  };
}
