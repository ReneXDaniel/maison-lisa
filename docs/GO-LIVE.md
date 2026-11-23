# Go-live checklist

The platform is feature-complete in development mode. Everything below has to be done before it takes real customers and real payments. None of it can be finished in code alone.

## 1. Legal (needs a qualified lawyer)

The legal pages (`/legal/imprint`, `privacy`, `terms`, `withdrawal`, `youth-protection`) are **structured placeholders**. They mark where the operator's details belong and are not legal advice.

- [ ] Legal notice (Impressum, § 5 DDG): set the `LEGAL_*` variables. The placeholder warning disappears once `LEGAL_ENTITY_NAME` is set.
- [ ] Privacy policy: list every processor (hosting, database, storage, e-mail, the verification provider, the payment provider), the legal bases, retention periods and international transfers. Sign data processing agreements with each processor.
- [ ] Terms and conditions for digital content, licence terms ("personal use, non-transferable"), and the rules for personalised requests.
- [ ] Withdrawal: the checkout already collects the customer's express request for immediate delivery and their acknowledgement that the right of withdrawal is lost. Have a lawyer confirm the wording for each target market.
- [ ] Youth protection: classify the content under JMStV. Decide whether a closed user group with a KJM-assessed verification system is required. Appoint a youth protection officer if one is required, and name them on the youth-protection page.
- [ ] Model consent and age records: keep signed consent, model releases and proof of age (18+) for every person shown. Lisa's own photographs need the same records. Check the record-keeping duties in every market you sell to.
- [ ] VAT: for B2C digital services in the EU the VAT is due in the customer's country (OSS). Check `src/lib/tax.ts` with a tax advisor. If the payment processor acts as merchant of record, align receipts and VAT with its invoices.
- [ ] Review the payment processor's and the verification provider's content policies.

## 2. Integrations

Work through [INTEGRATIONS.md](INTEGRATIONS.md): verification provider, payment processor, SMTP, S3, cron and ClamAV. Then repeat Scenarios A–E manually against the **provider sandboxes**, without simulators, before switching to live keys.

## 3. Content: replace all demo artwork

All current imagery is **generated demo artwork** carrying a "Demo artwork" label. It does not show a real person.

- [ ] Upload authentic photographs in the Atelier, following [CONTENT.md](CONTENT.md): hero, collections and products (originals plus previews), the About portrait, the behind-the-scenes gallery, hotspots and the silk reveal.
- [ ] Nail Studio: upload Lisa's base photograph **and** a matching nail mask.
- [ ] Optional: provide the real "Behind the Silk" frame sequence (a manifest URL in Settings).
- [ ] Lisa writes her own About texts, product descriptions and release notes. The defaults deliberately contain **no invented personal facts**.
- [ ] Remove the demo catalogue. Seed production with `SEED_DEMO_CONTENT=false` and delete or deactivate the example codes.

## 4. Language review

All eight languages are complete and pass `npm run i18n:check`. The DE, FR, ES, IT, NL, PL and PT texts are high-quality translations from English, but they have **not been reviewed by native speakers**. Have each customer-facing language and the e-mail templates proofread before launch, along with the legal texts in every language you publish them in.

## 5. Operations

- [ ] Complete the production hardening checklist in [SECURITY.md](SECURITY.md).
- [ ] Back up the database and storage, and test a restore.
- [ ] Set up uptime and error monitoring, plus alerts for failed webhooks.
- [ ] Do a final production run: register, verify with a real ID in the provider's test mode, chat, request, make a live purchase with a small amount, refund it, and delete the account.
