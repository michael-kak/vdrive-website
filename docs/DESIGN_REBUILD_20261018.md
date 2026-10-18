# Vdrive — design correction, 18 October 2026

## Scope
The owner rejected the first Vdrive live page as 1/10, asked for the actual Xanadria.com construction method and Awwwards-level references. This change is a review candidate under /studio/, not a claim of a complete commercial release. The previous homepage is preserved in Git history at 2a948bc8cd473ecca00ce650040b255e68930fbd. After browser acceptance, the temporary public root now directs visitors to /studio/. Xanadria PROD remains unchanged.

## Actual Xanadria inspection
The live HTML and referenced scripts were fetched from xanadria.com. The live source includes site.js, experience.js, workspace.js, journey-timeline.js, GSAP, ScrollTrigger, Lenis and Three.js. The experience is built as a staged business story and interactive workspace, rather than disconnected static blocks.

The marketing GitHub main package uses React/Next/Vinext/Cloudflare, but is NOT sufficient proof of the newer live visual source. PR14 explicitly documents the divergence from deployed v31. No Xanadria source or production asset was modified. Vendor copies of GSAP and ScrollTrigger retain their original license header.

Verified source references:
- https://xanadria.com/
- https://xanadria.com/site.js
- https://xanadria.com/experience.js
- https://github.com/michael-kak/xanadria-website/pull/14
- https://github.com/michael-kak/xanadria-website/blob/main/package.json

## Selected design references
- Longbow / Digital Butlers, Awwwards SOTD July 12, 2026: https://www.awwwards.com/sites/longbow — product-scale photography, oversized type, restrained grid, deliberate empty space. Inspected the Awwwards submission screenshot; initial live headless capture remained on the loading backdrop, so no full runtime usability pass is claimed.
- S-2K / zuji studio, Awwwards SOTD September 6, 2025: https://www.awwwards.com/sites/s-2k — vehicle-led visual narrative, purposeful motion and detail hierarchy. Inspected the Awwwards submission screenshot and public page content; no commercial conversion claim.
- Porsche Panamera, historic Awwwards reference: https://www.awwwards.com/sites/porsche-panamera — story-driven fullscreen product reveal, not a current retail benchmark.

These are design references, not assets to copy and not evidence that Vdrive has won awards or outperforms them.

## Implemented direction
- Hebrew-first editorial motor-gallery layout; ivory, charcoal and the real brand cyan.
- Actual brand logo and original photographs from Vdrive's public catalog. No fabricated cars, prices, sales, reviews, awards or imagery.
- Large typographic opening, interactive photo spotlight, large-format product cards, image-led chapters and GSAP scroll motion with reduced-motion fallback.
- Search, budget/body/sort filters, local favorites, 2–3 car comparison, native accessible vehicle modal and original photo gallery.
- A public-catalog adapter, exact observed read-only request and fixed organization identity. No access to private source records. Read-only source: https://v-drive.keez.co.il/ . The public getPublicCatalog endpoint returns Access-Control-Allow-Origin: *. Freshness and source are visible. A dated snapshot is not silently relabeled live; provider failure is disclosed.
- Historical sold view contains no invented sales. Xanadria's archive and CRM are not connected by this design change.
- Contact form prepares a WhatsApp message only. It neither sends the message nor stores contact details in Xanadria. Favorites are stored in the visitor browser only.

## Data-quality findings
At readback the public catalog returned four listings. The BYD Dolphin listing reported engine_type=petrol; ownership and registration-test interpretation were not re-verified. This candidate deliberately excludes these fields instead of presenting them as verified. It preserves the source's price/year/km/trim and clearly requests availability/price verification with the agency. No source record was modified.

## Release boundaries
- /studio/ is noindex, labeled as a design review candidate, on the existing temporary review host.
- This is not completion of vdrive.co.il, live Xanadria inventory/lead integration, finance, sold history or legal acceptance.
- Do not infer completion from a screenshot or a successful static deployment.
- Before integration: native tenant-scoped public API, actual source-status changes, complete sold history, real lead receipt/readback, approved legal copy, mobile QA and production hosting admission.

## Captured live-asset hashes
- site.js: SHA256 `b27c2bc2e977c0b18e0a6bedde114a43b0cb713676679bfd1dd9df920e5835f9`, 21649 bytes.
- experience.js: SHA256 `09841332bd186bce64fb7532a651080b830300a80b2a8888bf13ac7968633567`, 24876 bytes.
- site.css: SHA256 `cf9754b2e8aaa101b5f1e41db1d49b0e0e0e89daeb2cfe7b0373b2c5d3a32a0b`, 58992 bytes.
- experience.css: SHA256 `1161f12195343de97dab624696cc75a5065b68a0ab823e5670a9dadcd3c4497a`, 18572 bytes.

## Verified browser acceptance
29/29 assertions passed with zero JavaScript errors, including a fresh cross-origin public-catalog read, search/budget/sort/reset, saved items, two-car comparison, gallery controls, sold separation, WhatsApp preparation without sending, all images after scrolling, 320/390/768/1440 width checks, reduced-motion content visibility, and foreign-organization rejection. See STUDIO_BROWSER_ACCEPTANCE.json and verify-studio.cjs.

The observed four vehicles were fetched inside the page rather than a button that redirects to another catalog. Source remains Keez, not the future Xanadria endpoint. Historical sold records and automatic CRM lead intake remain unimplemented in this frontend.

## Publication
Publish this frontend review on the existing temporary review host only, with the root redirecting to /studio/. Keep noindex and visible review/source disclosures. No new hosting account, domain DNS, email, Xanadria app or production DB was changed. This does not represent completion of vdrive.co.il or the whole commercial system.
