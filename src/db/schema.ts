import {
  pgTable,
  pgEnum,
  pgSequence,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () => ts("updated_at").notNull().defaultNow();

/* ───────────────────────── Enums ───────────────────────── */

export const userRole = pgEnum("user_role", ["customer", "admin"]);
export const ageStatus = pgEnum("age_status", [
  "not_verified",
  "pending",
  "verified",
  "failed",
  "manual_review",
  "expired",
  "revoked",
]);
export const conversationStatus = pgEnum("conversation_status", [
  "new",
  "active",
  "awaiting_lisa",
  "awaiting_customer",
  "completed",
  "archived",
]);
export const messageKind = pgEnum("message_kind", ["text", "request", "offer", "system"]);
export const requestStatus = pgEnum("request_status", [
  "draft",
  "submitted",
  "under_review",
  "awaiting_customer",
  "offer_sent",
  "accepted",
  "rejected",
  "paid",
  "in_production",
  "delivered",
  "completed",
  "cancelled",
]);
export const offerStatus = pgEnum("offer_status", ["open", "accepted", "declined", "paid", "expired", "withdrawn"]);
export const productStatus = pgEnum("product_status", ["draft", "published", "archived"]);
export const orderStatus = pgEnum("order_status", [
  "pending",
  "paid",
  "failed",
  "cancelled",
  "expired",
  "refunded",
  "chargeback",
]);
export const discountKind = pgEnum("discount_kind", ["percent", "fixed"]);
export const discountScope = pgEnum("discount_scope", ["order", "products", "collections"]);
export const redemptionStatus = pgEnum("redemption_status", ["reserved", "redeemed", "released"]);
export const mediaVisibility = pgEnum("media_visibility", ["public", "verified", "private"]);
export const mediaKind = pgEnum("media_kind", ["site", "product_preview", "product_original", "look_option"]);

export const orderNumberSeq = pgSequence("order_number_seq", { startWith: 1001, increment: 1 });
export const requestNumberSeq = pgSequence("request_number_seq", { startWith: 101, increment: 1 });

/* ───────────────────────── Identity ───────────────────────── */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    emailVerifiedAt: ts("email_verified_at"),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("customer"),
    ageStatus: ageStatus("age_status").notNull().default("not_verified"),
    ageVerifiedAt: ts("age_verified_at"),
    ageVerifiedUntil: ts("age_verified_until"),
    /** Keyed HMAC of normalised identity attributes from the provider (no raw PII). Used for abuse prevention only. */
    identityFingerprint: text("identity_fingerprint"),
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
    mfaSecretEnc: text("mfa_secret_enc"),
    blockedAt: ts("blocked_at"),
    blockedReason: text("blocked_reason"),
    deletedAt: ts("deleted_at"),
    lastLoginAt: ts("last_login_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email), index("users_fingerprint_idx").on(t.identityFingerprint)],
);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  locale: text("locale").notNull().default("de"),
  notifyEmailMessages: boolean("notify_email_messages").notNull().default(true),
  notifyEmailOrders: boolean("notify_email_orders").notNull().default(true),
  readReceipts: boolean("read_receipts").notNull().default(true),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the session token. The raw token only ever exists in the user's cookie. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    mfaPending: boolean("mfa_pending").notNull().default(false),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: text("purpose").$type<"verify_email" | "reset_password" | "change_email">().notNull(),
    tokenHash: text("token_hash").notNull(),
    newEmail: text("new_email"),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("auth_tokens_hash_uq").on(t.tokenHash), index("auth_tokens_user_idx").on(t.userId)],
);

export const verificationRecords = pgTable(
  "verification_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerSessionId: text("provider_session_id").notNull(),
    status: ageStatus("status").notNull().default("pending"),
    /** Provider decision code / reason — never document images or biometric data. */
    reasonCode: text("reason_code"),
    decisionAt: ts("decision_at"),
    validUntil: ts("valid_until"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("verification_provider_session_uq").on(t.provider, t.providerSessionId),
    index("verification_user_idx").on(t.userId),
  ],
);

/** Idempotency ledger for provider callbacks (verification + payment). */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    kind: text("kind").$type<"verification" | "payment">().notNull(),
    eventKey: text("event_key").notNull(),
    outcome: text("outcome"),
    receivedAt: ts("received_at").notNull().defaultNow(),
    processedAt: ts("processed_at"),
  },
  (t) => [uniqueIndex("webhook_events_uq").on(t.provider, t.kind, t.eventKey)],
);

/* ───────────────────────── Messaging ───────────────────────── */

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subject: text("subject"),
    status: conversationStatus("status").notNull().default("new"),
    flagged: boolean("flagged").notNull().default(false),
    lastMessageAt: ts("last_message_at").notNull().defaultNow(),
    lastMessagePreview: text("last_message_preview"),
    lastSenderRole: userRole("last_sender_role"),
    customerLastReadAt: ts("customer_last_read_at"),
    customerLastDeliveredAt: ts("customer_last_delivered_at"),
    adminLastReadAt: ts("admin_last_read_at"),
    adminLastDeliveredAt: ts("admin_last_delivered_at"),
    lastCustomerEmailAt: ts("last_customer_email_at"),
    lastAdminEmailAt: ts("last_admin_email_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("conversations_customer_idx").on(t.customerId), index("conversations_last_idx").on(t.lastMessageAt)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").references(() => users.id, { onDelete: "set null" }),
    senderRole: userRole("sender_role"),
    kind: messageKind("kind").notNull().default("text"),
    body: text("body").notNull().default(""),
    requestId: uuid("request_id").references(() => customRequests.id, { onDelete: "set null" }),
    offerId: uuid("offer_id").references(() => customOffers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);

export const messageAttachments = pgTable(
  "message_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    uploaderId: uuid("uploader_id").references(() => users.id, { onDelete: "set null" }),
    storageKey: text("storage_key").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    scanStatus: text("scan_status").$type<"clean" | "reencoded" | "infected">().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("attachments_message_idx").on(t.messageId)],
);

export const conversationNotes = pgTable("conversation_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

/* ───────────────────────── Custom requests & offers ───────────────────────── */

export type RequestSelections = {
  polishColor?: string;
  polishFinish?: string;
  style?: string;
  stockings?: string;
  footwear?: string;
  accessories?: string;
  background?: string;
};

export const customRequests = pgTable(
  "custom_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: integer("number")
      .notNull()
      .default(sql`nextval('request_number_seq')`),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
    status: requestStatus("status").notNull().default("submitted"),
    selections: jsonb("selections").$type<RequestSelections>().notNull().default({}),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("requests_customer_idx").on(t.customerId), uniqueIndex("requests_number_uq").on(t.number)],
);

export const customOffers = pgTable(
  "custom_offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requestId: uuid("request_id").references(() => customRequests.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    deliveryDetails: text("delivery_details").notNull().default(""),
    deadline: ts("deadline"),
    status: offerStatus("status").notNull().default("open"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    respondedAt: ts("responded_at"),
    deliveredAt: ts("delivered_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("offers_customer_idx").on(t.customerId)],
);

export const deliveryFiles = pgTable("delivery_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  offerId: uuid("offer_id")
    .notNull()
    .references(() => customOffers.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: createdAt(),
});

/* ───────────────────────── Catalog ───────────────────────── */

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    published: boolean("published").notNull().default(true),
    coverMediaId: uuid("cover_media_id"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("collections_slug_uq").on(t.slug)],
);

export const collectionTranslations = pgTable(
  "collection_translations",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.locale] })],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    collectionId: uuid("collection_id").references(() => collections.id, { onDelete: "set null" }),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    imageCount: integer("image_count").notNull().default(0),
    format: text("format").notNull().default("JPEG · high resolution"),
    status: productStatus("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    /** Requires a verified adult to even see previews (e.g. "The Private Edit"). */
    verifiedPreviewOnly: boolean("verified_preview_only").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    coverMediaId: uuid("cover_media_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("products_slug_uq").on(t.slug), index("products_collection_idx").on(t.collectionId)],
);

export const productTranslations = pgTable(
  "product_translations",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    details: text("details").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.productId, t.locale] })],
);

export type MediaVariant = { width: number; key: string; bytes: number };

/** All images: site imagery, product previews (public/verified) and protected product originals. */
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: mediaKind("kind").notNull(),
    visibility: mediaVisibility("visibility").notNull(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    variants: jsonb("variants").$type<MediaVariant[]>().notNull().default([]),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: integer("size_bytes").notNull().default(0),
    alt: text("alt").notNull().default(""),
    isDemo: boolean("is_demo").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    uploadedById: uuid("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("media_product_idx").on(t.productId)],
);

/* ───────────────────────── Commerce ───────────────────────── */

export const carts = pgTable(
  "carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    guestTokenHash: text("guest_token_hash"),
    discountCode: text("discount_code"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("carts_user_uq").on(t.userId), uniqueIndex("carts_guest_uq").on(t.guestTokenHash)],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    offerId: uuid("offer_id").references(() => customOffers.id, { onDelete: "cascade" }),
    addedAt: ts("added_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("cart_items_product_uq").on(t.cartId, t.productId),
    uniqueIndex("cart_items_offer_uq").on(t.cartId, t.offerId),
  ],
);

export const discounts = pgTable(
  "discounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Uppercase code; null for the automatic welcome discount. */
    code: text("code"),
    name: text("name").notNull(),
    kind: discountKind("kind").notNull(),
    /** Percent (1–100) or fixed amount in cents. */
    value: integer("value").notNull(),
    scope: discountScope("scope").notNull().default("order"),
    productIds: jsonb("product_ids").$type<string[]>().notNull().default([]),
    collectionIds: jsonb("collection_ids").$type<string[]>().notNull().default([]),
    excludedProductIds: jsonb("excluded_product_ids").$type<string[]>().notNull().default([]),
    minOrderCents: integer("min_order_cents").notNull().default(0),
    startsAt: ts("starts_at"),
    endsAt: ts("ends_at"),
    maxRedemptions: integer("max_redemptions"),
    perCustomerLimit: integer("per_customer_limit").notNull().default(1),
    firstOrderOnly: boolean("first_order_only").notNull().default(false),
    customerId: uuid("customer_id").references(() => users.id, { onDelete: "cascade" }),
    stackable: boolean("stackable").notNull().default(false),
    active: boolean("active").notNull().default(true),
    isWelcome: boolean("is_welcome").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("discounts_code_uq").on(t.code)],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: text("number").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    status: orderStatus("status").notNull().default("pending"),
    currency: text("currency").notNull().default("EUR"),
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    vatRateBp: integer("vat_rate_bp").notNull().default(0),
    vatCents: integer("vat_cents").notNull().default(0),
    country: text("country").notNull(),
    locale: text("locale").notNull().default("de"),
    discountSummary: jsonb("discount_summary").$type<{ id: string; code: string | null; name: string; amountCents: number }[]>().notNull().default([]),
    paymentProvider: text("payment_provider").notNull(),
    paymentRef: text("payment_ref"),
    checkoutExpiresAt: ts("checkout_expires_at"),
    termsAcceptedAt: ts("terms_accepted_at").notNull(),
    waiverAcceptedAt: ts("waiver_accepted_at").notNull(),
    paidAt: ts("paid_at"),
    refundedAt: ts("refunded_at"),
    customerEmailSnapshot: text("customer_email_snapshot"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("orders_number_uq").on(t.number), index("orders_user_idx").on(t.userId), index("orders_status_idx").on(t.status)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    offerId: uuid("offer_id").references(() => customOffers.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerRef: text("provider_ref"),
    type: text("type").$type<"payment" | "refund" | "chargeback">().notNull(),
    status: text("status").$type<"succeeded" | "failed" | "pending">().notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("payments_order_idx").on(t.orderId)],
);

export const discountRedemptions = pgTable(
  "discount_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    discountId: uuid("discount_id")
      .notNull()
      .references(() => discounts.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    identityFingerprint: text("identity_fingerprint"),
    status: redemptionStatus("status").notNull().default("reserved"),
    amountCents: integer("amount_cents").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("redemptions_discount_order_uq").on(t.discountId, t.orderId), index("redemptions_user_idx").on(t.userId)],
);

export const entitlements = pgTable(
  "entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    offerId: uuid("offer_id").references(() => customOffers.id, { onDelete: "set null" }),
    grantedAt: ts("granted_at").notNull().defaultNow(),
    revokedAt: ts("revoked_at"),
    revokeReason: text("revoke_reason"),
  },
  (t) => [
    uniqueIndex("entitlements_order_product_uq").on(t.orderId, t.productId),
    uniqueIndex("entitlements_order_offer_uq").on(t.orderId, t.offerId),
    index("entitlements_user_idx").on(t.userId),
  ],
);

/* ───────────────────────── Engagement ───────────────────────── */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    data: jsonb("data").$type<Record<string, string | number | null>>().notNull().default({}),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const lookPolls = pgTable("look_polls", {
  id: uuid("id").primaryKey().defaultRandom(),
  active: boolean("active").notNull().default(true),
  endsAt: ts("ends_at"),
  createdAt: createdAt(),
});

export const lookPollOptions = pgTable("look_poll_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  pollId: uuid("poll_id")
    .notNull()
    .references(() => lookPolls.id, { onDelete: "cascade" }),
  stockings: text("stockings").notNull(),
  footwear: text("footwear").notNull(),
  accessory: text("accessory").notNull(),
  background: text("background").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const lookVotes = pgTable(
  "look_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => lookPolls.id, { onDelete: "cascade" }),
    optionId: uuid("option_id")
      .notNull()
      .references(() => lookPollOptions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("look_votes_poll_user_uq").on(t.pollId, t.userId)],
);

export const releases = pgTable(
  "releases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    /** Countdown is only shown when a real date is configured. */
    releaseAt: ts("release_at"),
    published: boolean("published").notNull().default(true),
    coverMediaId: uuid("cover_media_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("releases_slug_uq").on(t.slug)],
);

export const releaseTranslations = pgTable(
  "release_translations",
  {
    releaseId: uuid("release_id")
      .notNull()
      .references(() => releases.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.releaseId, t.locale] })],
);

export const announcementSubscribers = pgTable(
  "announcement_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    locale: text("locale").notNull(),
    tokenHash: text("token_hash").notNull(),
    consentAt: ts("consent_at").notNull(),
    confirmedAt: ts("confirmed_at"),
    unsubscribedAt: ts("unsubscribed_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("subscribers_email_uq").on(t.email), uniqueIndex("subscribers_token_uq").on(t.tokenHash)],
);

/* ───────────────────────── CMS & operations ───────────────────────── */

export const contentBlocks = pgTable(
  "content_blocks",
  {
    key: text("key").notNull(),
    locale: text("locale").notNull(),
    value: text("value").notNull(),
    updatedById: uuid("updated_by_id").references(() => users.id, { onDelete: "set null" }),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.key, t.locale] })],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: ts("window_start").notNull(),
  count: integer("count").notNull().default(0),
});

export const mailOutbox = pgTable(
  "mail_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    to: text("to").notNull(),
    subject: text("subject").notNull(),
    html: text("html").notNull(),
    text: text("text").notNull(),
    template: text("template").notNull(),
    sentAt: ts("sent_at"),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("mail_outbox_created_idx").on(t.createdAt)],
);
