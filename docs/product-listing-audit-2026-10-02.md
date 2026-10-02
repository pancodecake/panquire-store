# Product listing audit — 2 October 2026

## Applied to Shopify

- Updated existing active T-01 and T-02, without duplicate products or status changes.
- Titles: Panquire T-01 / Panquire T-02. Existing handles and prices ($2,000 / $2,599 USD) preserved.
- Added differentiated descriptions, grouped specifications, FAQs, 2-year warranty and shipping-excluded copy.
- SEO topic: electric dirt bike, with model-specific 8 kW / 11 kW peak-power titles and natural descriptions.
- Category: Electric Motorcycles & Scooters. Vendor Panquire; product type Electric Dirt Bike.
- SKUs: PAN-T-01-BLK and PAN-T-02-BLK. No unnecessary color variants.
- Added five useful tags per product. No new collections; only the existing Home page collection was present. Recommend Electric Dirt Bikes if a collection is needed later.
- Created merchant-owned `custom.panquire_specifications` (multi-line text; `Group|Label|Value`, one row per line). The shared theme reads it, with matching preview fallbacks.
- T-01: six new clean images, descriptive alt text, front three-quarter drivetrain view first. This view shows the full silhouette, wheels and branding clearly; the previous cutout remains last.
- T-02: added the supplied Bike.png studio view. Retained the existing recognizable full-bike cutout first.
- Preserved tax settings, untracked inventory, physical/shipping requirement, prices, blank compare-at price, blank cost and barcode fields.

## Source decisions

The two pasted briefs are byte-for-byte identical. Current T-01.md and T-02.md supersede the earlier product tables. The latest explicit brief supplies the two-year warranty and US/Europe fulfillment/shipping policy. Market research informs emphasis, not technical facts or competitor claims.

- Black replaces obsolete T-01 Bronze Gold wording.
- Three electronic power levels replace misleading mechanical “3-Speed” wording. Handlebar buttons, no clutch.
- Removed obsolete one-year warranty, 25–30-day delivery and wholesale wire-transfer terms from the product template/specifications.
- Removed ambiguous old T-02 /60Kg gross/net value. New source says **68 kg including battery***, but the unexplained asterisk still needs confirmation. Not used as shipping weight or published as a verified weight.
- T-01 battery weight and charging time also have unexplained asterisks.
- Four-hour full-charge claims need reconciliation with 6A and 31.2Ah/41Ah capacity; no charge-time promise published.
- Nominal energy is explicitly calculated: 60 × 31.2 = 1,872 Wh; 72 × 41 = 2,952 Wh. Not presented as measured usable energy.
- Eco ranges are labeled stated figures, with unspecified test conditions and real-world variability disclosed.
- Suspension rider-weight range (40–95 kg) is distinct from maximum total load (150 kg).
- T6 brake-fluid wording withheld pending confirmation of the precise approved fluid/maintenance specification.

## Media held back

All 39 supplied images were visually inspected in contact sheets. No images generated or edited.

- Most remaining T-02 gallery files and several T-01 detail files visibly contain checkerboard backgrounds. Request clean originals/true transparency before storefront use.
- “Futuristic Neon Vehicle Dashboard HUD” and “Electric Scooter Dashboard Cockpit” occur in both model folders; exact hardware/model match needs confirmation. Do not infer features from these graphics.
- T-01 dirty/clean alternate profiles are redundant and/or have checkerboards; six clean views provide the useful gallery coverage.
- Accessory images do not establish per-model compatibility or box contents. The battery, keys, tools and connectors have not been advertised as included with both models.
- No dedicated supplied lifestyle photo was matched confidently in this batch. Existing story image placeholders remain until suitable images are confirmed.

## Still required

| Product | Field / issue | Needed and why |
|---|---|---|
| Both | Inventory | Actual available stock per fulfillment location; untracked inventory currently permits sales without stock control. |
| Both | Shipping weight | Verified packed/shipping weight. Shopify currently has 0 lb; do not substitute bike net/curb weight. Required for accurate weight-based rates. |
| Both | Shipping configuration | Confirm supported destinations, profiles and checkout rates. Copy was updated, but rates were not configured or checkout-tested. |
| Both | Customs | Confirm country of manufacture and HS classification; warehouse location does not establish origin. |
| Both | Cost / barcode | Verified internal cost and officially assigned GTIN, if applicable. Both left blank. |
| Both | Warranty | Full coverage, exclusions, battery/component terms, geographic limits and claims procedure. Two-year duration only is confirmed. |
| Both | Charging | Confirm times and test conditions for the actual supplied charger. |
| T-01 | Battery weight | Resolve the 15 kg asterisk before publishing. |
| T-02 | Bike weight | Confirm starred 68 kg including battery and its measurement definition. |
| Both | Accessories | Confirm which keys/tools/connectors are included and their model compatibility. |
| Both | Compliance / rider fit | No verified road legality, water rating, certification, age suitability or universal rider-height claims supplied. None invented. |
| Both | Returns / assembly | Confirm return policy, assembly steps and any service/parts promises before adding them. |

## Verification and deployment

- Shopify read-back verified SEO, category, specification field values, unchanged prices and shipping-required status.
- Runnable local check: `node docs/check-models.cjs`; listing assertions also run from `docs/product-listings.cjs`.
- Theme changes belong to the Git-connected theme; no live-theme publishing action was taken.
- Browser inspection was blocked by a CDP focus-emulation timeout. Visual layout and checkout remain unverified in this pass.
