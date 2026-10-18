# Vdrive — Yuval contact routing

Owner-approved recipient: Yuval, 0544555365. Applies to this Vdrive frontend only.

## Change
- Header, footer and mobile-menu Contact buttons open the same accessible choice dialog.
- Call link: tel:0544555365.
- WhatsApp link: https://wa.me/972544555365.
- Existing vehicle enquiries, comparison actions and contact/trade-in form all use the same Yuval WhatsApp destination, preserving the vehicle/message context.
- Direct phone/WhatsApp shortcuts are also available in the contact section; phone and WhatsApp remain available in the no-JavaScript fallback.
- Contact stays visible in the mobile header. Dialog is named, closable with Escape, and constrained to narrow screens.
- App/CSS revision query prevents a newly fetched page using the earlier contact code from the browser cache.

## Verification
24 scoped browser checks passed locally; zero errors. Tested header/footer/mobile entry points, exact tel/WhatsApp target, form message preparation, vehicle CTA, keyboard closing, old-number absence and layout at 320/390/768 pixels. No phone call was placed and no WhatsApp message was sent. This is not proof of message delivery or physical-iPhone acceptance.

Existing regression tests are updated to require the newly authorized number and contact choice, not the old destination.

## Boundaries
No domain/DNS, Google Workspace, original Keez catalog, inventory, tenant provisioning or Xanadria CRM changes. No claim of whole-site completion. Historical screenshots and receipts are not rewritten.

Full regression rerun: 30 passed, 0 failed at 2026-10-18T17:15:53.774Z. Live catalog, filters, gallery, comparison, responsive and reduced-motion checks retained.
