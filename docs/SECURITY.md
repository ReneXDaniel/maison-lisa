# Security

## Measures in place

**Authentication**
- Passwords are hashed with Argon2id. Session tokens are 256-bit random values, stored only as SHA-256 hashes, and sent in an httpOnly, SameSite=Lax cookie (`__Host-` prefix plus `Secure` in production).
- E-mail confirmation, password reset and e-mail change use hashed, single-use, expiring tokens.
- A password reset or password change signs out all other sessions. Customers can also sign out other devices themselves.
- Optional TOTP two-step login. The secret is encrypted with AES-256-GCM (`APP_ENCRYPTION_KEY`).
- Rate limiting (stored in Postgres) covers login, registration, resets, verification starts, messages, uploads, codes and subscriptions.

**Authorisation**
- Access levels are enforced on the server for every page, server action and API route. The proxy only routes locales.
- Conversations, attachments, offers, orders and files are checked against the owner on every request.
- The admin area answers **404** to every non-admin, whether signed in or not.
- Restricted (blocked) accounts lose messaging, requests and checkout.

**Age verification**
- Restricted features require a currently valid verification. A checkbox alone is never enough.
- Only signed provider webhooks can change a verification status. Each event is processed once.
- Documents and dates of birth are never stored. Age is computed on the server from the provider's decision.

**Payments**
- An order becomes paid only through a signed webhook. Each event is processed once, and amount and currency must match.
- Prices, discounts and VAT are always recomputed on the server. Values sent by the client are ignored.
- Discounts are locked with `SELECT … FOR UPDATE` at checkout, and each redemption is recorded once.

**Files**
- Originals and deliveries are stored privately. Download links are HMAC-signed, bound to the user, short-lived, and the entitlement is re-checked on every download.
- Uploads are sniffed by magic bytes. Only JPEG, PNG and WebP are accepted, with size limits. Every image is re-encoded with sharp, which strips EXIF and GPS data and neutralises polyglot files. ClamAV scanning is optional.
- Previews can be watermarked. Previews limited to verified adults are served only to them.

**Web**
- Strict Content Security Policy, `frame-ancestors 'none'`, HSTS (production), `X-Frame-Options: DENY`, a strict Referrer-Policy and a restrictive Permissions-Policy.
- Server actions have built-in origin checks. Custom POST routes check the same origin.
- Internal redirects (`next`) only accept same-site relative paths.
- E-mails never include message content.

**Privacy (GDPR)**
- Customers can change their e-mail address and password, manage read receipts and notifications, and delete their account themselves. Invoices are kept in anonymised form where the law requires it.
- The admin audit log records sensitive admin actions.

**Development safety**
- The dev mailbox, verification and payment simulators are visibly labelled. They run only when `ALLOW_DEV_SIMULATORS=true` and `NODE_ENV` is not production.
- In production, the provider factories refuse to start with `dev` providers, the simulators or the mail outbox. This was checked: the dev routes return 404 and the dev webhook is refused.
- The only exception is an explicit **preview deployment** (`PREVIEW_MODE=true` with a `PREVIEW_PASSWORD` of 8+ characters). Every page then sits behind one shared password (HTTP Basic auth in `src/proxy.ts`), pages are marked `noindex`, and the banner reads "Preview mode". Without the password the process refuses to start the providers. Never use it for real customers.

## Before going live

- [ ] Generate new `SESSION_SECRET`, `APP_ENCRYPTION_KEY`, `CRON_SECRET` and provider secrets, and keep them in a secret manager.
- [ ] Set `ALLOW_DEV_SIMULATORS=false`, real providers and `MAIL_TRANSPORT=smtp`, and set `SEED_DEMO_CONTENT=false`.
- [ ] Create Lisa's production admin account with a strong, unique password and enable two-step login.
- [ ] Use a private S3 bucket and enable encrypted, tested database backups.
- [ ] Use TLS only, and set `TRUST_PROXY` correctly for your proxy.
- [ ] Turn on ClamAV if possible.
- [ ] Schedule `/api/cron/cleanup`.
- [ ] Run `npm audit`, and keep Next.js and dependencies patched.
- [ ] Commission an external penetration test before launch, focused on authorisation (IDOR), webhooks and file access.
- [ ] Monitor and alert on webhook failures (look for `[webhook:*]` log lines) and on 5xx rates.
