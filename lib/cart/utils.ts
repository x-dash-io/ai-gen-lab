import { cookies } from "next/headers";
import { Cart, CartItem } from "./types";

const CART_COOKIE_NAME = "cart";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const EMPTY_CART: Cart = {
  items: [],
  totalCents: 0,
  itemCount: 0,
  couponCode: null,
  discountTotal: 0,
  finalTotal: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function normalizeCartItem(value: unknown): CartItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const courseId = toStringValue(value.courseId);
  const courseSlug = toStringValue(value.courseSlug);
  const title = toStringValue(value.title);

  if (!courseId || !courseSlug || !title) {
    return null;
  }

  const priceCents = Math.max(0, Math.round(toNumber(value.priceCents, 0)));
  const quantity = Math.max(1, Math.round(toNumber(value.quantity, 1)));

  let availableInventory: number | null = null;
  if (typeof value.availableInventory === "number" && Number.isFinite(value.availableInventory)) {
    availableInventory = Math.max(0, Math.round(value.availableInventory));
  }

  return {
    courseId,
    courseSlug,
    title,
    priceCents,
    quantity,
    availableInventory,
  };
}

function calculateTotals(items: CartItem[]) {
  const totalCents = items.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { totalCents, itemCount };
}

export async function getCartFromCookies(): Promise<Cart> {
  try {
    const cookieStore = await cookies();
    const cartCookie = cookieStore.get(CART_COOKIE_NAME);

    if (!cartCookie?.value) {
      return EMPTY_CART;
    }

    try {
      const parsed = JSON.parse(cartCookie.value) as unknown;

      // Handle legacy array format.
      if (Array.isArray(parsed)) {
        const normalizedItems = parsed
          .map((item) => normalizeCartItem(item))
          .filter((item): item is CartItem => item !== null);

        const { totalCents, itemCount } = calculateTotals(normalizedItems);

        return {
          items: normalizedItems,
          totalCents,
          itemCount,
          couponCode: null,
          discountTotal: 0,
          finalTotal: totalCents,
        };
      }

      if (!isRecord(parsed)) {
        return EMPTY_CART;
      }

      const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
      const items = rawItems
        .map((item) => normalizeCartItem(item))
        .filter((item): item is CartItem => item !== null);

      const { totalCents, itemCount } = calculateTotals(items);
      const discountTotal = Math.max(0, Math.round(toNumber(parsed.discountTotal, 0)));
      const finalTotal =
        parsed.finalTotal !== undefined
          ? Math.max(0, Math.round(toNumber(parsed.finalTotal, totalCents - discountTotal)))
          : Math.max(0, totalCents - discountTotal);

      return {
        items,
        totalCents,
        itemCount,
        couponCode: toStringValue(parsed.couponCode),
        discountTotal,
        finalTotal,
      };
    } catch (parseError) {
      console.error("Error parsing cart cookie:", parseError);
      return EMPTY_CART;
    }
  } catch (error) {
    console.error("Error getting cart from cookies:", error);
    return EMPTY_CART;
  }
}

export async function setCartInCookies(cartOrItems: Cart | CartItem[]): Promise<void> {
  const cookieStore = await cookies();

  const dataToStore: Cart = Array.isArray(cartOrItems)
    ? (() => {
        const items = cartOrItems;
        const { totalCents, itemCount } = calculateTotals(items);
        return {
          items,
          totalCents,
          itemCount,
          couponCode: null,
          discountTotal: 0,
          finalTotal: totalCents,
        };
      })()
    : cartOrItems;

  cookieStore.set(CART_COOKIE_NAME, JSON.stringify(dataToStore), {
    maxAge: CART_COOKIE_MAX_AGE,
    httpOnly: false, // Allow client-side access.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export function addItemToCart(currentItems: CartItem[], newItem: CartItem): CartItem[] {
  const existingIndex = currentItems.findIndex(
    (item) => item.courseId === newItem.courseId
  );

  if (existingIndex >= 0) {
    const updated = [...currentItems];
    const existingItem = updated[existingIndex];

    if (
      existingItem.availableInventory !== null &&
      existingItem.quantity >= existingItem.availableInventory
    ) {
      return currentItems;
    }

    updated[existingIndex] = {
      ...existingItem,
      quantity: existingItem.quantity + 1,
    };

    return updated;
  }

  return [...currentItems, { ...newItem, quantity: newItem.quantity || 1 }];
}

export function updateItemQuantity(
  currentItems: CartItem[],
  courseId: string,
  newQuantity: number
): CartItem[] {
  if (newQuantity <= 0) {
    return removeItemFromCart(currentItems, courseId);
  }

  const updated = [...currentItems];
  const itemIndex = updated.findIndex((item) => item.courseId === courseId);

  if (itemIndex >= 0) {
    const item = updated[itemIndex];
    if (item.availableInventory !== null && newQuantity > item.availableInventory) {
      return currentItems;
    }

    updated[itemIndex] = {
      ...item,
      quantity: newQuantity,
    };
  }

  return updated;
}

export function removeItemFromCart(currentItems: CartItem[], courseId: string): CartItem[] {
  return currentItems.filter((item) => item.courseId !== courseId);
}

export function clearCart(): Cart {
  return { ...EMPTY_CART };
}
