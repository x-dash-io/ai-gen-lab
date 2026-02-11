import { Cart, CartItem } from "./types";
import { cookies } from "next/headers";

const CART_COOKIE_NAME = "cart";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function getCartFromCookies(): Promise<Cart> {
  try {
    const cookieStore = await cookies();
    const cartCookie = cookieStore.get(CART_COOKIE_NAME);

    if (!cartCookie?.value) {
      return { items: [], totalCents: 0, itemCount: 0, couponCode: null, discountTotal: 0, finalTotal: 0 };
    }

    try {
      const parsed = JSON.parse(cartCookie.value);

      // Handle legacy array format
      if (Array.isArray(parsed)) {
        const normalizedItems = parsed.map((item: any) => ({
          ...item,
          quantity: item.quantity || 1,
          availableInventory: item.availableInventory ?? null,
        }));
        const totalCents = normalizedItems.reduce((sum: number, item: any) => sum + (item.priceCents || 0) * (item.quantity || 1), 0);
        const itemCount = normalizedItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
        return {
          items: normalizedItems,
          totalCents,
          itemCount,
          couponCode: null,
          discountTotal: 0,
          finalTotal: totalCents
        };
      }

      // Handle new object format
      const items: CartItem[] = Array.isArray(parsed.items) ? parsed.items : [];
      const normalizedItems = items.map(item => ({
        ...item,
        quantity: item.quantity || 1,
        availableInventory: item.availableInventory ?? null,
      }));
      const totalCents = normalizedItems.reduce((sum, item) => sum + (item.priceCents || 0) * (item.quantity || 1), 0);
      const itemCount = normalizedItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

      return {
        items: normalizedItems,
        totalCents,
        itemCount,
        couponCode: parsed.couponCode || null,
        discountTotal: parsed.discountTotal || 0, // Ensure discountTotal is read
        finalTotal: parsed.finalTotal !== undefined ? parsed.finalTotal : (totalCents - (parsed.discountTotal || 0)),
      };
    } catch (parseError) {
      console.error("Error parsing cart cookie:", parseError);
      return { items: [], totalCents: 0, itemCount: 0, couponCode: null, discountTotal: 0, finalTotal: 0 };
    }
  } catch (error) {
    console.error("Error getting cart from cookies:", error);
    return { items: [], totalCents: 0, itemCount: 0, couponCode: null, discountTotal: 0, finalTotal: 0 };
  }
}

export async function setCartInCookies(cartOrItems: Cart | CartItem[]): Promise<void> {
  const cookieStore = await cookies();

  let dataToStore;
  if (Array.isArray(cartOrItems)) {
    // Convert array to object format
    const items = cartOrItems;
    const totalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    dataToStore = {
      items,
      totalCents,
      itemCount,
      couponCode: null,
      discountTotal: 0,
      finalTotal: totalCents
    };
  } else {
    dataToStore = cartOrItems;
  }

  cookieStore.set(CART_COOKIE_NAME, JSON.stringify(dataToStore), {
    maxAge: CART_COOKIE_MAX_AGE,
    httpOnly: false, // Allow client-side access
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export function addItemToCart(currentItems: CartItem[], newItem: CartItem): CartItem[] {
  const existingIndex = currentItems.findIndex((item) => item.courseId === newItem.courseId);
  if (existingIndex >= 0) {
    const updated = [...currentItems];
    const existingItem = updated[existingIndex];
    if (existingItem.availableInventory !== null && existingItem.quantity >= existingItem.availableInventory) {
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

export function updateItemQuantity(currentItems: CartItem[], courseId: string, newQuantity: number): CartItem[] {
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
  return {
    items: [],
    totalCents: 0,
    itemCount: 0,
    couponCode: null,
    discountTotal: 0,
    finalTotal: 0,
  };
}
