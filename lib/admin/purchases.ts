import { prisma } from "@/lib/prisma";

export async function getAllPurchases() {
  return prisma.purchase.findMany({
    include: {
      User: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      Course: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPurchaseById(purchaseId: string) {
  return prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      User: true,
      Course: true,
      Enrollment: true,
      Payment: true,
    },
  });
}
