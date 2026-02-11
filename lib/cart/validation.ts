import { CartItem } from "./types";

/**
 * Check if a cart item is valid based on inventory availability
 * @param item - The cart item to validate
 * @returns true if the item is valid (has inventory available), false otherwise
 */
export function isCartItemValid(item: CartItem): boolean {
  // If inventory is null, it's unlimited - always valid
  if (item.availableInventory === null) {
    return true;
  }
  
  // If inventory is 0, item is out of stock - invalid
  if (item.availableInventory === 0) {
    return false;
  }
  
  // If current quantity exceeds available inventory, invalid
  if (item.quantity > item.availableInventory) {
    return false;
  }
  
  return true;
}

/**
 * Check if a cart item can have its quantity increased
 * @param item - The cart item to check
 * @returns true if quantity can be increased, false otherwise
 */
export function canIncreaseQuantity(item: CartItem): boolean {
  if (item.availableInventory === null) {
    return true; // Unlimited inventory
  }
  return (item.quantity || 1) < item.availableInventory;
}
