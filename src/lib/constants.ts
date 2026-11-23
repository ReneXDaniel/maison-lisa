/** Shared, non-secret constants usable from both server and client modules. */
export const AGE_NOTICE_COOKIE = "ml_age_notice";

export const REQUEST_STATUSES = ["submitted", "under_review", "awaiting_customer", "offer_sent", "accepted", "rejected", "paid", "in_production", "delivered", "completed", "cancelled"] as const;
export const CONVERSATION_STATUSES = ["new", "active", "awaiting_lisa", "awaiting_customer", "completed", "archived"] as const;
