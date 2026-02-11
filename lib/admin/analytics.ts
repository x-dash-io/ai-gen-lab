import { prisma } from "@/lib/prisma";

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  count: number;
}

export interface CategorySalesData {
  category: string;
  sales: number;
  revenue: number;
}

export interface UserGrowthDataPoint {
  date: string;
  users: number;
  cumulative: number;
}

export interface EnrollmentTrendDataPoint {
  date: string;
  enrollments: number;
}

export interface TopCourseData {
  courseId: string;
  title: string;
  sales: number;
  revenue: number;
}

/**
 * Get revenue data over time (last 30 days)
 */
export async function getRevenueOverTime(days: number = 30): Promise<RevenueDataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const purchases = await prisma.purchase.findMany({
    where: {
      status: "paid",
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      amountCents: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Group by date
  const dailyData = new Map<string, { revenue: number; count: number }>();

  purchases.forEach((purchase) => {
    const date = purchase.createdAt.toISOString().split("T")[0];
    const existing = dailyData.get(date) || { revenue: 0, count: 0 };
    dailyData.set(date, {
      revenue: existing.revenue + purchase.amountCents,
      count: existing.count + 1,
    });
  });

  // Fill in missing dates with zeros
  const result: RevenueDataPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const data = dailyData.get(dateStr) || { revenue: 0, count: 0 };
    result.push({
      date: dateStr,
      revenue: data.revenue / 100, // Convert cents to dollars
      count: data.count,
    });
  }

  return result;
}

/**
 * Get sales by category
 */
export async function getCategorySales(): Promise<CategorySalesData[]> {
  const result = await prisma.$queryRaw<Array<{ category: string; sales: bigint; revenue: bigint }>>`
    SELECT
      COALESCE(c.category, 'Uncategorized') as category,
      COUNT(p.id) as sales,
      SUM(p."amountCents") as revenue
    FROM "Purchase" p
    JOIN "Course" c ON p."courseId" = c.id
    WHERE p.status::text = 'paid'
    GROUP BY COALESCE(c.category, 'Uncategorized')
  `;

  return result.map((row) => ({
    category: row.category,
    sales: Number(row.sales),
    revenue: Number(row.revenue) / 100, // Convert cents to dollars
  }));
}

/**
 * Get user growth over time (last 30 days)
 */
export async function getUserGrowth(days: number = 30): Promise<UserGrowthDataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Get total users before start date
  const usersBeforeStart = await prisma.user.count({
    where: {
      createdAt: {
        lt: startDate,
      },
    },
  });

  // Group by date
  const dailyData = new Map<string, number>();
  users.forEach((user) => {
    const date = user.createdAt.toISOString().split("T")[0];
    dailyData.set(date, (dailyData.get(date) || 0) + 1);
  });

  // Build cumulative data
  const result: UserGrowthDataPoint[] = [];
  let cumulative = usersBeforeStart;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const newUsers = dailyData.get(dateStr) || 0;
    cumulative += newUsers;
    result.push({
      date: dateStr,
      users: newUsers,
      cumulative,
    });
  }

  return result;
}

/**
 * Get enrollment trends (last 30 days)
 */
export async function getEnrollmentTrends(days: number = 30): Promise<EnrollmentTrendDataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      grantedAt: {
        gte: startDate,
      },
    },
    select: {
      grantedAt: true,
    },
    orderBy: {
      grantedAt: "asc",
    },
  });

  // Group by date
  const dailyData = new Map<string, number>();
  enrollments.forEach((enrollment) => {
    const date = enrollment.grantedAt.toISOString().split("T")[0];
    dailyData.set(date, (dailyData.get(date) || 0) + 1);
  });

  // Fill in missing dates
  const result: EnrollmentTrendDataPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    result.push({
      date: dateStr,
      enrollments: dailyData.get(dateStr) || 0,
    });
  }

  return result;
}

/**
 * Get top courses by revenue
 */
export async function getTopCoursesByRevenue(limit: number = 10): Promise<TopCourseData[]> {
  const groupedPurchases = await prisma.purchase.groupBy({
    by: ["courseId"],
    where: {
      status: "paid",
    },
    _sum: {
      amountCents: true,
    },
    _count: {
      _all: true,
    },
    orderBy: {
      _sum: {
        amountCents: "desc",
      },
    },
    take: limit,
  });

  const courseIds = groupedPurchases.map((p) => p.courseId);

  const courses = await prisma.course.findMany({
    where: {
      id: {
        in: courseIds,
      },
    },
    select: {
      id: true,
      title: true,
    },
  });

  const courseMap = new Map(courses.map((c) => [c.id, c.title]));

  return groupedPurchases.map((group) => ({
    courseId: group.courseId,
    title: courseMap.get(group.courseId) || "Unknown Course",
    sales: group._count._all,
    revenue: (group._sum.amountCents || 0) / 100, // Convert cents to dollars
  }));
}
