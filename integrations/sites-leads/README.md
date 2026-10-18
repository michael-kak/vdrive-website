# Vdrive Sites intake — prepared, not connected or published

Source baseline: `733d6d435b482348ea7ed5f8c32e5d37b2cd63ea`.
Owner started a separate migration to native ChatGPT Sites. This branch MUST NOT be auto-merged or deployed over that process. First resolve its actual project ID, new URL, code version and current writer. Never use Xanadria's marketing Site or DB for Vdrive.

## What is included
- Additive SQL in `schema.sql`: Vdrive's temporary website lead inbox, a durable pending delivery queue, and hashed rate-limit metadata.
- `handleLead(request, env)`: a Workers/D1-style handler prepared for the supported Sites runtime. Mount POST `/api/leads` in the actual Site's existing server router; do not create another hosting account, use Wrangler or replace its existing router blindly.
- Frontend: phone/name + intent + preferred return channel + optional note + explicit consent for this enquiry. Car and finance simulation context follow the customer into the form.
- Calculation and normalization are shared with the server. The server recomputes a submitted simulation and does not treat the client's reported car price/availability as verified.
- Idempotent receipt, parameterized SQL, bounded body, exact origin, trusted-edge rate limiting, and an atomic lead+pending-outbox write. A DB error never becomes `saved:true`. No anonymous GET/list/export route is supplied.

## Required before enabling server storage
1. Identify the **existing Vdrive Site** and read its actual runtime/storage bindings. Check current migrations and existing intake. Adapt/reuse instead of installing a second pipeline if migration already created one.
2. Review the actual business/privacy notice: controller identity, contact details, purpose, recipients/processors, voluntary data and consequences, access/correction requests and agreed retention. Do not treat the draft UI notice as a legal certification.
3. Apply this additive SQL only to the identified Vdrive Site's database with the platform-supported migration workflow. Confirm a backup/rollback plan and existing table compatibility. No database has been altered by this branch.
4. Bind DB to that database, PUBLIC_ORIGIN to the exact published HTTPS origin, LEAD_HMAC_SECRET to a newly generated server-side secret (at least 32 characters), and INTAKE_PRIVACY_APPROVED to `true` only after approval. Do not place the secret in browser JS or GitHub.
5. Confirm the ingress sets a trustworthy `CF-Connecting-IP` header. Do not accept a visitor's X-Forwarded-For as identity. Without a trustworthy provider header the handler fails closed and must be adapted to the documented runtime rather than bypassed.
6. Enable the browser with `window.VDRIVE_INTAKE_CONFIG={enabled:true,endpoint:'/api/leads'}` before loading the conversion module. The default is intentionally WhatsApp preparation; it must not say an unpersisted lead was saved.
7. Use synthetic data in the real published Site: submit, obtain receipt, independently read the DB, reload and retry, verify one row and one queue entry; test malformed input, foreign origin, forbidden read, database failure and rate limit. Confirm unrelated Site access cannot read the lead inbox.
8. Attach an authorized notification delivery process for **Yuval**. A row in `vdrive_lead_outbox` is pending, not delivered. Record provider acceptance/receipt, reconcile ambiguous timeouts, retry without duplicate messages and alert the operator on prolonged failure. No email/SMS/WhatsApp notification sender or credentials are configured here.
9. Read and handle leads only through authenticated owner/editor tools. Before custom admin UI, implement server authentication and access control; a hidden URL is not protection.
10. Agree lead retention, deletion and recovery policy. Expire old rate windows on a bounded schedule. Do not leave rate metadata or rejected test data indefinitely. Do not publish personal data in logs, analytics or URLs.

## Handoff to Xanadria later
There is no active Vdrive business in Xanadria yet. Treat the Site inbox as a **delivery/intake queue**, not a second CRM. When the correct Vdrive tenant is accepted, forward with the immutable lead ID and maintain an acknowledged delivery receipt. Do not clear the Site record because an HTTP request was attempted. Never route enquiries into Internal or the marketing Site as a substitute.

## Finance boundary
A financing calculator is illustrative arithmetic, not financial eligibility assessment, lending, credit approval or acceptance of finance contracts. No ID number, credit history, bank details, payment-card details or credit application attachments are collected. The optional example 8% is explicitly labeled, not a Vdrive/lender rate. Fees are upfront, balloons are explicit, and APR is not claimed. Actual financial offers must be handled by the authorized financing provider.

## Tests
`node --test tests/finance-intake.test.mjs`

The browser suite in `tests/conversion-browser.cjs` uses the same handler and isolated SQLite under an explicitly synthetic edge to verify the journey. That proves the candidate logic, not a live Sites database or actual notification delivery.

## Site editor adoption
Preserve the migrated design/assets, stock/search/favorites/comparison/gallery and Yuval 0544555365. Adopt this branch's changes through a reviewed diff after migration, not a whole-folder overwrite. Verify calculator assumptions, contact layout and storage in the Site preview, then publish using the managed Sites workflow. Leave domain/DNS/mail and Xanadria untouched.
