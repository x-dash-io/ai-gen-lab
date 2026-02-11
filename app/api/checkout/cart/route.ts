import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPayPalOrder } from "@/lib/paypal";
import { isAdmin } from "@/lib/access";
import { getCartFromCookies } from "@/lib/cart/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Block admins from purchasing courses
    if (isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: "Admins cannot purchase courses" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { courseIds } = body;

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json({ error: "Course IDs are required" }, { status: 400 });
    }

    // Fetch courses
    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
    });

    if (courses.length !== courseIds.length) {
      return NextResponse.json({ error: "Some courses not found" }, { status: 404 });
    }

    // Check for existing purchases
    const existingPurchases = await prisma.purchase.findMany({
      where: {
        userId: session.user.id,
        courseId: { in: courseIds },
        status: "paid",
      },
    });

    const purchasedCourseIds = new Set(existingPurchases.map((p: any) => p.courseId));
    const coursesToPurchase = courses.filter((c: any) => !purchasedCourseIds.has(c.id));

    if (coursesToPurchase.length === 0) {
      return NextResponse.json(
        { error: "You already own all selected courses" },
        { status: 400 }
      );
    }

    // Get Cart for Coupon Info
    const cart = await getCartFromCookies();
    let coupon = null;
    let discountTotal = 0;

    if (cart.couponCode) {
      coupon = await prisma.coupon.findUnique({
        where: { code: cart.couponCode },
      });

      if (coupon && coupon.isActive) {
        // Validate coupon again just to be safe
        const now = new Date();
        if ((coupon.startDate <= now) && (!coupon.endDate || coupon.endDate >= now)) {
          if (!coupon.maxUses || coupon.usedCount < coupon.maxUses) {
            // Calculate discount
            const totalCents = coursesToPurchase.reduce((sum, c) => sum + c.priceCents, 0);
            if (!coupon.minOrderAmount || totalCents >= coupon.minOrderAmount) {
              if (coupon.discountType === "FIXED") {
                discountTotal = Math.min(coupon.discountAmount, totalCents);
              } else {
                discountTotal = Math.round(totalCents * (coupon.discountAmount / 100));
                if (coupon.maxDiscountAmount) {
                  discountTotal = Math.min(discountTotal, coupon.maxDiscountAmount);
                }
              }
            }
          }
        }
      }
    }

    // Check inventory availability
    const outOfStockCourses = coursesToPurchase.filter(
      (course: any) => course.inventory !== null && course.inventory <= 0
    );

    if (outOfStockCourses.length > 0) {
      return NextResponse.json(
        {
          error: `Some courses are out of stock: ${outOfStockCourses.map((c: any) => c.title).join(", ")}`,
          outOfStock: outOfStockCourses.map((c: any) => c.id),
        },
        { status: 400 }
      );
    }

    // Calculate pro-rated discount per item
    // Simplification: We will just deduct detailed amounts if possible, or just store the final amount paid per item
    // Pro-rating: itemPrice - (itemPrice / totalOriginalPrice * totalDiscount)
    const totalOriginalPrice = coursesToPurchase.reduce((sum, c) => sum + c.priceCents, 0);

    // Create purchases
    const purchases = await Promise.all(
      coursesToPurchase.map((course: any) => {
        const purchaseId = `purchase_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

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
            couponId: coupon?.id, // Link coupon
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
        });
      })
    );

    // Increment coupon usage if used (optimistic usage count, finalized on webhook?)
    // Actually, we should probably increment usage ONLY when paid. 
    // But PayPal flow is async. We might link it now.
    // If we increment now, and they cancel, it's bad.
    // Better to increment in the webhook when 'paid'.
    // However, validation 'usedCount' check earlier might fail if many pending. 
    // For now, let's leave incrementing to the payment success handler (webhook).

    const totalAmountCents = purchases.reduce((sum: number, p: any) => sum + p.amountCents, 0);
    // Sanity check against finalTotal
    // Total might differ slightly due to rounding, but it's what we are charging.

    const purchaseIds = purchases.map((p: any) => p.id).join(",");
    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const { orderId, approvalUrl } = await createPayPalOrder({
      amountCents: totalAmountCents,
      currency: "usd",
      returnUrl: `${appUrl}/api/payments/paypal/capture?purchases=${encodeURIComponent(purchaseIds)}`,
      cancelUrl: `${appUrl}/cart?checkout=cancelled`,
      purchaseId: purchases[0].id,
    });

    // Update all purchases with order ID
    await prisma.purchase.updateMany({
      where: {
        id: { in: purchases.map((p: any) => p.id) },
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
