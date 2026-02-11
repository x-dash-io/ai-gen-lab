import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse JSON response from fetch
 * Handles cases where server returns HTML error pages instead of JSON
 */
export async function safeJsonParse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");

  // Check if response is actually JSON
  if (!contentType || !contentType.includes("application/json")) {
    // Try to get text for better error message
    const text = await response.text().catch(() => "");

    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      throw new Error(
        `Server returned HTML instead of JSON (Status: ${response.status}). ` +
        `This usually means authentication failed or the server encountered an error. ` +
        `Please refresh the page and try again.`
      );
    }

    throw new Error(
      `Server returned ${response.status}: ${response.statusText}. ` +
      `Expected JSON but got ${contentType || "unknown content type"}.`
    );
  }

  try {
    return await response.json();
  } catch {
    throw new Error(
      `Failed to parse server response as JSON. ` +
      `Status: ${response.status} ${response.statusText}`
    );
  }
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price / 100)
}
