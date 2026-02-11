import { prisma } from "@/lib/prisma";

export type HomePageStats = {
  lessons: number;
  averageRating: string;
  supportSlaHours: number;
};

export type HomePagePlan = {
  id: string;
  name: string;
  monthlyPriceCents: number;
  features: string[];
};

const FALLBACK_STATS: HomePageStats = {
  lessons: 120,
  averageRating: "4.9/5",
  supportSlaHours: 24,
};

const FALLBACK_PLANS: HomePagePlan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPriceCents: 0,
    features: ["Preview lessons", "Community feed", "Limited templates"],
  },
  {
    id: "professional",
    name: "Professional",
    monthlyPriceCents: 2900,
    features: ["Full course access", "Live sprint labs", "Priority implementation support"],
  },
  {
    id: "founder",
    name: "Founder",
    monthlyPriceCents: 9900,
    features: ["Advanced tracks", "1:1 strategy reviews", "Team collaboration seat"],
  },
];

export async function getHomePageData() {
  try {
    const [lessonCount, ratingAgg, plans] = await Promise.all([
      prisma.lesson.count(),
      prisma.review.aggregate({ _avg: { rating: true } }),
      prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { priceMonthlyCents: "asc" },
        take: 3,
      }),
    ]);

    const stats: HomePageStats = {
      lessons: lessonCount || FALLBACK_STATS.lessons,
      averageRating: ratingAgg._avg.rating ? `${ratingAgg._avg.rating.toFixed(1)}/5` : FALLBACK_STATS.averageRating,
      supportSlaHours: FALLBACK_STATS.supportSlaHours,
    };

    const dynamicPlans: HomePagePlan[] = plans.map((plan: (typeof plans)[number]) => ({
      id: plan.id,
      name: plan.name,
      monthlyPriceCents: plan.priceMonthlyCents,
      features: [plan.description || `${plan.name} membership`],
    }));

    return {
      stats,
      plans: dynamicPlans.length > 0 ? dynamicPlans : FALLBACK_PLANS,
    };
  } catch (error) {
    console.warn("Unable to load homepage data from database, using fallback content.", error);

    return {
      stats: FALLBACK_STATS,
      plans: FALLBACK_PLANS,
    };
  }
}
