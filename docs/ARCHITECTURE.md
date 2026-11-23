# Architecture

## Stack

- **Next.js 16 (App Router)**, React 19, TypeScript in strict mode (`noUncheckedIndexedAccess`), Tailwind CSS 4.
- **PostgreSQL 16** accessed through **Drizzle ORM** (node-postgres). The schema lives in `src/db/schema.ts` and the SQL migrations in `src/db/migrations`.
- **next-intl 4** for eight locales on prefixed routes (`/de`, `/en`, …).
- Animation: GSAP ScrollTrigger (parallax and the "Behind the Silk" canvas sequence), motion (entrances), and a small raw WebGL shader for the silk reveal. Every animation respects `prefers-reduced-motion`.
- State: server components by default. Client state is limited to zustand: the UI counters and the persisted studio selections (`ml-studio`).

`src/proxy.ts` (Next 16's middleware) does **locale routing only**. Authorisation always happens on the server, in pages, actions and route handlers, and never in the proxy.

## Layout

```
src/
  app/
    [locale]/(site)/…        public boutique, account, auth, checkout, dev simulators
    [locale]/(app)/…         full-height app pages (messages)
    [locale]/admin/…         Lisa's Atelier (404 for everyone else)
    actions/                 server actions (auth, cart/checkout, chat, offers, admin, …)
    api/                     route handlers (SSE, chat, files, media, webhooks, cron)
  components/                ui, layout, chat, shop, studio, requests, home, admin, …
  config/                    brand.ts, legal.ts
  db/                        schema, client, migrations
  i18n/                      routing, navigation, request config, message loading
  lib/                       domain services (below)
messages/<locale>/<ns>.json  translations, one file per namespace
scripts/                     migrate, seed, demo assets, i18n check, translation writers
tests/unit, tests/e2e
```

## Domain services (`src/lib`)

| Module | Responsibility |
|---|---|
| `auth/session.ts`, `auth/guards.ts` | Sessions (a SHA-256-hashed token in the DB plus an httpOnly cookie) and access levels |
| `auth/password.ts`, `auth/tokens.ts`, `auth/mfa.ts` | Argon2id, single-use hashed tokens, TOTP with an AES-256-GCM encrypted secret |
| `verification/*` | Provider interface (`dev`, `veriff`). The decision is evaluated server-side and age is computed from the provider's DOB, which is **never stored**. |
| `chat.ts`, `realtime/bus.ts`, `notifications.ts` | Conversations, messages, receipts, notifications; LISTEN/NOTIFY fan-out to SSE |
| `catalog.ts`, `cart.ts`, `visitor.ts` | Catalogue with per-locale translations, guest and account carts |
| `pricing.ts`, `discounts.ts`, `tax.ts`, `checkout.ts` | Pure pricing engine, discount validation and locking, VAT, order creation |
| `payments/*` | Provider interface (`dev`, `verotel`) and idempotent fulfilment |
| `purchases.ts`, `storage/*`, `images.ts` | Entitlements, private storage (local or S3), signed download tokens, image re-encoding, optional ClamAV |
| `settings.ts`, `content.ts`, `releases.ts` | Admin-editable settings, per-locale text overrides, "The Next Chapter" releases |
| `rate-limit.ts`, `audit.ts`, `mail.ts` | Postgres-backed rate limiting, admin audit log, localised mail (outbox or SMTP) |

## Access levels

`requirePage(locale, level, returnTo)` for pages and `requireAction(level)` for actions and routes:

| Level | Requirement | Used for |
|---|---|---|
| `user` | signed in, not blocked | account pages |
| `email` | plus a confirmed e-mail address | starting age verification |
| `adult` | plus a **currently valid** age verification | messaging, requests, checkout, downloads, voting, verified-only previews |
| `admin` | admin role | `/admin`, admin actions and routes. Everyone else gets **404**. |

Each page and API redirects to the next missing step (login → confirm e-mail → verify age), and the original destination is preserved in `next`.

## Data model highlights

The database has 38 tables. Statuses are Postgres enums and money is stored as integer cents.

- `users`, `profiles`, `sessions`, `auth_tokens`, `rate_limits`
- `verification_records`: the result, provider reference and validity only. A keyed identity fingerprint (HMAC) lets the welcome discount be limited to one per real person.
- `webhook_events`: idempotency ledger for **all** provider webhooks (verification and payment).
- `conversations`, `messages`, `message_attachments`, `conversation_notes` (Lisa's private notes), `notifications`
- `custom_requests` (with sequential request numbers), `custom_offers`, `delivery_files`
- `collections`, `products` and their `*_translations`, `media`, `carts`, `cart_items`
- `orders` (with sequential order numbers), `order_items`, `payment_transactions`, `entitlements`
- `discounts`, `discount_redemptions`
- `settings`, `content_blocks`, `releases` (+ translations), `look_polls`, `look_poll_options`, `look_votes`, `announcement_subscribers`, `audit_logs`, `mail_outbox`

## Realtime

`/api/realtime` is an SSE stream for the signed-in user. Writes publish small events with `pg_notify`. Each server instance holds one `LISTEN` connection and forwards each event to the matching local subscribers. This means several instances work without Redis. The client turns events into `ml:rt` window events. Delivered receipts are acknowledgements sent by the receiving client. Read receipts respect the reader's privacy setting.

> Hosting note: SSE needs long-lived connections, and LISTEN/NOTIFY needs a **direct (session) database connection**. A transaction-mode pooler such as PgBouncer in transaction mode breaks LISTEN.

## Money flow

1. The cart shows prices. Checkout **recomputes everything on the server**: prices, availability and ownership, the welcome discount, the code, and VAT for the customer's country. It then creates a `pending` order and locks the discounts (`SELECT … FOR UPDATE`).
2. The payment provider's hosted page takes the payment. The return page polls the order status and **never** marks an order paid.
3. The signed webhook → `payments/fulfillment.ts` → in **one transaction**: ledger insert into `webhook_events` (duplicate → no-op), amount and currency check, order `paid`, entitlements, offers and requests set to `paid`, discount redemption recorded.
4. Refund or chargeback revokes the entitlements. Expired pending orders are cleaned up by `/api/cron/cleanup`.

## Delivery

Originals never sit under `/public`. `/api/files/<token>` accepts only a short-lived HMAC token that is bound to the user, and it re-checks the entitlement on every request. Previews use `/api/media/<id>`. Media marked `verified` are served only to age-verified customers and to the admin. With S3 storage, the file route redirects to a presigned URL that is valid for 60 seconds.

## Internationalisation

- `messages/<locale>/<namespace>.json` hold the translations, and `messages/index.ts` is a generated static loader. English is the base layer, and missing keys fall back to it. The fallbacks that `i18n:check` documents are the admin and legal namespaces outside DE/EN and the dev namespace.
- `npm run i18n:check` validates the key structure, the ICU placeholders and the plural categories, including Polish one/few/many/other.
- The language a visitor chooses is stored in the `ML_LOCALE` cookie and, for signed-in users, in the profile. Login redirects to the profile language. E-mails use the recipient's language.
- Every page has hreflang alternates for all eight locales plus `x-default`, and the sitemap is localised.
