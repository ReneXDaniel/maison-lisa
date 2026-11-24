# External services and configuration

The application runs fully on your own machine in development. Going live needs the accounts below. Two of them, age verification and payments, require approval from the provider, and both adapters must be tested against the provider's sandbox before launch.

| Service | Why it is needed | Status in this codebase |
|---|---|---|
| Identity and age verification provider | ID document plus liveness check before messaging, requests, purchases and downloads | Veriff adapter implemented, **not tested against a live account** |
| Adult-friendly payment processor | Card payments for adult content | Verotel FlexPay adapter implemented, **not tested against a live account** |
| SMTP e-mail service | Verification, password reset, receipts, notifications | Ready (Nodemailer SMTP) |
| S3-compatible object storage (recommended) | Private originals, deliveries, chat attachments | Ready (AWS S3, Cloudflare R2, MinIO, …) |
| PostgreSQL 16 | Data plus realtime (LISTEN/NOTIFY) | Ready |
| ClamAV (optional) | Virus scanning of uploads | Ready (`clamd` INSTREAM) |
| Scheduler | Calls `/api/cron/cleanup` | Any cron service |

## Identity and age verification

**Code:** `src/lib/verification/providers/veriff.ts` and the webhook at `/api/webhooks/verification/veriff`.

How it works:
1. A customer starts verification, and the server creates a session with the provider.
2. The customer completes the document and liveness checks on the provider's own pages.
3. The provider posts a **signed** decision to the webhook. The webhook checks the signature, records the event once in `webhook_events`, and computes the customer's age **on the server** from the date of birth in the decision. The date of birth and the documents are never stored. Only the result, the provider reference and the validity period are kept.

Before launch:
1. Open a Veriff account (or choose another provider and implement the `VerificationProvider` interface in `src/lib/verification/types.ts`).
2. Set `VERIFICATION_PROVIDER=veriff`, `VERIFF_API_KEY` and `VERIFF_SHARED_SECRET`.
3. In the provider dashboard, configure the decision webhook to `https://<your-domain>/api/webhooks/verification/veriff`.
4. In the provider sandbox, check the field names, the status values and the signature header against the provider's current documentation. Then run approved, declined, resubmission and expired cases end to end.
5. **Germany / JMStV:** have a lawyer confirm which age-verification standard applies to this offer. If a closed user group is required, the system must use a KJM-positively assessed age verification concept. Check the KJM's published list and confirm with the provider that its product and contract cover this use.
6. Set `VERIFICATION_VALIDITY_DAYS` to the re-verification period you decide on.

## Payments

**Code:** `src/lib/payments/providers/verotel.ts` and the webhook at `/api/webhooks/payment/verotel`.

Adult content is excluded by many mainstream payment processors, so check each provider's acceptable-use policy. Processors that specialise in adult merchants include Verotel, CCBill, Segpay and Epoch. Some of them act as merchant of record, which changes who issues invoices and handles VAT.

Before launch:
1. Apply for a merchant account. Approval usually includes a review of the content and the website.
2. Set `PAYMENT_PROVIDER=verotel`, `VEROTEL_SHOP_ID` and `VEROTEL_SIGNATURE_KEY`.
3. Configure the postback URL `https://<your-domain>/api/webhooks/payment/verotel` and the success and cancel URLs as Verotel requires.
4. With the merchant test account, check the parameter names, the postback event values (sale, credit, chargeback) and the signature scheme. Also check IP allowlisting if Verotel offers it.
5. Test one success, one failure, one cancellation, one refund and one chargeback. Confirm that access to the files is revoked after the refund and after the chargeback.
6. If you use another processor, implement the `PaymentProvider` interface in `src/lib/payments/types.ts`.

Guarantees that hold for every provider, through `src/lib/payments/fulfillment.ts`:
- An order is marked paid only by a signed webhook, never by the return page.
- Each event is processed exactly once (`webhook_events` ledger), and amount and currency must match.
- Refunds and chargebacks revoke entitlements.

## E-mail

Set the following:
- `MAIL_TRANSPORT=smtp`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`
- `MAIL_FROM`

Configure SPF, DKIM and DMARC for the sending domain. Check that the provider accepts adult-industry senders; transactional services differ on this. E-mails never contain message content, only a link back to the site. Set `ADMIN_NOTIFY_EMAIL` for Lisa's alerts.

## Storage

- `STORAGE_DRIVER=local` writes to `STORAGE_LOCAL_DIR` (default `./storage`, outside `/public`). Use it only on a single server with backups.
- For production, use `STORAGE_DRIVER=s3` with `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`. The bucket must be **private** with no public access. Downloads use presigned URLs that are valid for 60 seconds.
- Add the storage host to `CSP_EXTRA_IMG` (and to `CSP_EXTRA_CONNECT` if you serve the stocking frame sequence from there).
- Check that the storage provider's terms allow adult content.

## Optional services

- **ClamAV:** set `CLAMAV_HOST` and `CLAMAV_PORT` to a `clamd` instance. All uploaded images are re-encoded with sharp in any case, which strips metadata and neutralises polyglot files.
- **Cron:** call `POST /api/cron/cleanup` about every 15 minutes with the header `Authorization: Bearer $CRON_SECRET`. It expires abandoned pending orders and removes expired sessions, old tokens and old rate-limit windows.

## Hosting requirements

- A Node.js 22 server process (`npm run build && npm start`) with long-lived HTTP connections for SSE, so not a short-timeout serverless function for `/api/realtime`.
- A **direct** PostgreSQL connection. Transaction-mode poolers break `LISTEN`.
- TLS. In production the session cookie uses the `__Host-` prefix with `Secure`.
- Behind a reverse proxy, set `TRUST_PROXY=true` so rate limiting sees real client IPs, but only if the proxy overwrites `X-Forwarded-For`.
- On start, the provider factories refuse to run with any development simulator, the `dev` providers or the mail outbox when `NODE_ENV=production`.

## Environment variable reference

| Variable | Required in production | Purpose |
|---|---|---|
| `APP_URL` | yes | Public base URL, used for links in e-mails, provider callbacks and canonical URLs |
| `DATABASE_URL` | yes | PostgreSQL connection (direct, not transaction-pooled) |
| `SESSION_SECRET` | yes | 32+ random characters; HMAC for signed links and guest cart tokens |
| `APP_ENCRYPTION_KEY` | yes | 32-byte base64 key; AES-256-GCM for MFA secrets |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | no (`de`) | Default language |
| `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_CREATOR_NAME`, `NEXT_PUBLIC_BRAND_MONOGRAM`, `NEXT_PUBLIC_SUPPORT_EMAIL` | no | Branding overrides (defaults in `src/config/brand.ts`) |
| `LEGAL_ENTITY_NAME`, `LEGAL_REPRESENTATIVE`, `LEGAL_ADDRESS`, `LEGAL_EMAIL`, `LEGAL_VAT_ID`, `LEGAL_REGISTER`, `LEGAL_YOUTH_PROTECTION_OFFICER` | yes | Seller details for the legal notice and receipts. A visible placeholder warning shows until they are set. |
| `MAIL_TRANSPORT` | yes (`smtp`) | `outbox` (development) or `smtp` |
| `MAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE` | yes | SMTP settings |
| `ADMIN_NOTIFY_EMAIL` | recommended | Where Lisa receives new-message, request and order alerts |
| `STORAGE_DRIVER`, `STORAGE_LOCAL_DIR` | yes | `local`, `s3`, or `db` (files in PostgreSQL; for previews on hosts without a persistent disk) |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | with `s3` | Private bucket |
| `VERIFICATION_PROVIDER` | yes (`veriff`) | `dev` is refused in production |
| `VERIFF_API_KEY`, `VERIFF_SHARED_SECRET`, `VERIFF_BASE_URL` | with `veriff` | Provider credentials |
| `VERIFICATION_VALIDITY_DAYS` | no (365) | How long a verification stays valid |
| `PAYMENT_PROVIDER` | yes (`verotel`) | `dev` is refused in production |
| `VEROTEL_SHOP_ID`, `VEROTEL_SIGNATURE_KEY`, `VEROTEL_FLEXPAY_URL` | with `verotel` | Merchant credentials |
| `ALLOW_DEV_SIMULATORS` | must be `false` | Enables the dev mailbox, verification and payment simulators (development, or a protected preview) |
| `PREVIEW_MODE`, `PREVIEW_PASSWORD` | must be unset | Password-protected preview deployment: allows the labelled simulators in a production build, behind one site-wide password (see `docs/VORSCHAU.md`) |
| `DEV_WEBHOOK_SECRET` | development only | Signs simulator webhooks |
| `CRON_SECRET` | yes | Bearer secret for `/api/cron/cleanup` |
| `CLAMAV_HOST`, `CLAMAV_PORT` | optional | Virus scanning |
| `TRUST_PROXY` | depends | Trust `X-Forwarded-For` from your reverse proxy |
| `RATE_LIMIT_DISABLED` | must be unset | Development and tests only; ignored in production |
| `CSP_EXTRA_IMG`, `CSP_EXTRA_CONNECT` | optional | Extra hosts for the Content Security Policy |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_DEMO_CONTENT` | seeding only | Initial admin account; demo catalogue (set `false` for production) |
