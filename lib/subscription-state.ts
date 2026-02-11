import type { SubscriptionStatus } from "@prisma/client";

const ALLOWED_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  pending: ["active", "expired", "cancelled"],
  active: ["cancelled", "past_due", "expired"],
  cancelled: ["expired", "active"],
  past_due: ["active", "cancelled", "expired"],
  expired: ["active"],
};

export function canTransitionSubscriptionStatus(
  fromStatus: SubscriptionStatus,
  toStatus: SubscriptionStatus
): boolean {
  if (fromStatus === toStatus) {
    return true;
  }

  return ALLOWED_TRANSITIONS[fromStatus].includes(toStatus);
}

export function assertSubscriptionTransition(
  fromStatus: SubscriptionStatus,
  toStatus: SubscriptionStatus
): void {
  if (!canTransitionSubscriptionStatus(fromStatus, toStatus)) {
    throw new Error(`INVALID_STATE_TRANSITION: ${fromStatus} -> ${toStatus}`);
  }
}

export function getAllowedSubscriptionTransitions(status: SubscriptionStatus): SubscriptionStatus[] {
  return [...ALLOWED_TRANSITIONS[status]];
}
