import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/access";
import { getCartFromCookies } from "@/lib/cart/utils";
import { createPayPalOrder } from "@/lib/paypal";
import { prisma } from "@/lib/prisma";

type CheckoutCourse = {
  id: string;
  title: string;
  priceCents: number;
  inventory: number | null;
};

type ExistingPurchase = {
  courseId: string;
};

type CheckoutPurchase = {
  id: string;
  amountCents: number;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Block admins from purchasing courses.
    if (isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: "Admins cannot purchase courses" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as { courseIds?: unknown };
    const inputCourseIds = body.courseIds;

    if (!Array.isArray(inputCourseIds) || inputCourseIds.length === 0) {
      return NextResponse.json(
        { error: "Course IDs are required" },
        { status: 400 }
      );
    }

    const courseIds = inputCourseIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0
    );

    if (courseIds.length !== inputCourseIds.length) {
      return NextResponse.json(
        { error: "Course IDs must be non-empty strings" },
        { status: 400 }
      );
    }

    // Fetch courses.
    const courses = (await prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: {
        id: true,
        title: true,
        priceCents: true,
        inventory: true,
      },
    })) as CheckoutCourse[];

    if (courses.length !== courseIds.length) {
      return NextResponse.json({ error: "Some courses not found" }, { status: 404 });
    }

    // Check for existing purchases.
    const existingPurchases = (await prisma.purchase.findMany({
      where: {
        userId: session.user.id,
        courseId: { in: courseIds },
        status: "paid",
      },
      select: { courseId: true },
    })) as ExistingPurchase[];

    const purchasedCourseIds = new Set(
      existingPurchases.map((purchase) => purchase.courseId)
    );
    const coursesToPurchase = courses.filter(
      (course) => !purchasedCourseIds.has(course.id)
    );

    if (coursesToPurchase.length === 0) {
      return NextResponse.json(
        { error: "You already own all selected courses" },
        { status: 400 }
      );
    }

    // Get cart for coupon info.
    const cart = await getCartFromCookies();
    let coupon:
      | {
          id: string;
          code: string;
          isActive: boolean;
          discountType: "FIXED" | "PERCENTAGE";
          discountAmount: number;
          maxDiscountAmount: number | null;
          minOrderAmount: number | null;
          startDate: Date;
          endDate: Date | null;
          maxUses: number | null;
          usedCount: number;
        }
      | null = null;
    let discountTotal = 0;

    if (cart.couponCode) {
      coupon = await prisma.coupon.findUnique({
        where: { code: cart.couponCode },
      });

      if (coupon && coupon.isActive) {
        const now = new Date();
        if (coupon.startDate <= now && (!coupon.endDate || coupon.endDate >= now)) {
          if (!coupon.maxUses || coupon.usedCount < coupon.maxUses) {
            const totalCents = coursesToPurchase.reduce(
              (sum, course) => sum + course.priceCents,
              0
            );

            if (!coupon.minOrderAmount || totalCents >= coupon.minOrderAmount) {
              if (coupon.discountType === "FIXED") {
                discountTotal = Math.min(coupon.discountAmount, totalCents);
              } else {
                discountTotal = Math.round(
                  totalCents * (coupon.discountAmount / 100)
                );
                if (coupon.maxDiscountAmount) {
                  discountTotal = Math.min(
                    discountTotal,
                    coupon.maxDiscountAmount
                  );
                }
              }
            }
          }
        }
      }
    }

    // Check inventory availability.
    const outOfStockCourses = coursesToPurchase.filter(
      (course) => course.inventory !== null && course.inventory <= 0
    );

    if (outOfStockCourses.length > 0) {
      return NextResponse.json(
        {
          error: `Some courses are out of stock: ${outOfStockCourses
            .map((course) => course.title)
            .join(", ")}`,
          outOfStock: outOfStockCourses.map((course) => course.id),
        },
        { status: 400 }
      );
    }

    // Pro-rate discount across items.
    const totalOriginalPrice = coursesToPurchase.reduce(
      (sum, course) => sum + course.priceCents,
      0
    );

    const purchases: CheckoutPurchase[] = await Promise.all(
      coursesToPurchase.map(async (course) => {
        const purchaseId = `purchase_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 9)}`;

        let amountToPay = course.priceCents;
        let itemDiscount = 0;
        if (discountTotal > 0 && totalOriginalPrice > 0) {
          const ratio = course.priceCents / totalOriginalPrice;
          itemDiscount = Math.round(discountTotal * ratio);
          amountToPay = Math.max(0, course.priceCents - itemDiscount);
        }

        return prisma.purchase.upsert({
          where: {
            userId_courseId: {
              userId: session.user.id,
              courseId: course.id,
            },
          },
          update: {
            status: "pending",
            provider: "paypal",
            amountCents: amountToPay,
            couponId: coupon?.id,
            priceOriginalCents: course.priceCents,
            priceDiscountCents: itemDiscount,
            pricingSnapshot: {
              couponId: coupon?.id ?? null,
              couponCode: coupon?.code ?? null,
              discountType: coupon?.discountType ?? null,
              discountAmount: coupon?.discountAmount ?? null,
              discountAppliedCents: itemDiscount,
              totalOrderDiscountCents: discountTotal,
              originalPriceCents: course.priceCents,
              finalPriceCents: amountToPay,
            },
          },
          create: {
            id: purchaseId,
            userId: session.user.id,
            courseId: course.id,
            amountCents: amountToPay,
            currency: "usd",
            status: "pending",
            provider: "paypal",
            couponId: coupon?.id,
            priceOriginalCents: course.priceCents,
            priceDiscountCents: itemDiscount,
            pricingSnapshot: {
              couponId: coupon?.id ?? null,
              couponCode: coupon?.code ?? null,
              discountType: coupon?.discountType ?? null,
              discountAmount: coupon?.discountAmount ?? null,
              discountAppliedCents: itemDiscount,
              totalOrderDiscountCents: discountTotal,
              originalPriceCents: course.priceCents,
              finalPriceCents: amountToPay,
            },
          },
          select: {
            id: true,
            amountCents: true,
          },
        });
      })
    );

    const totalAmountCents = purchases.reduce(
      (sum, purchase) => sum + purchase.amountCents,
      0
    );

    const purchaseIds = purchases.map((purchase) => purchase.id).join(",");
    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const { orderId, approvalUrl } = await createPayPalOrder({
      amountCents: totalAmountCents,
      currency: "usd",
      returnUrl: `${appUrl}/api/payments/paypal/capture?purchases=${encodeURIComponent(
        purchaseIds
      )}`,
      cancelUrl: `${appUrl}/cart?checkout=cancelled`,
      purchaseId: purchases[0].id,
    });

    // Update all purchases with order ID.
    await prisma.purchase.updateMany({
      where: {
        id: { in: purchases.map((purchase) => purchase.id) },
      },
      data: {
        providerRef: orderId,
      },
    });

    return NextResponse.json({
      orderId,
      approvalUrl,
    });
  } catch (error) {
    console.error("Error creating cart checkout:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout" },
      { status: 500 }
    );
  }
}
