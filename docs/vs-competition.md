# VS Competition

The existing `/pages/compare` page uses `sections/vs-competition.liquid`, the shared record adapter, and the comparison CSS/JavaScript. The desktop and mobile header both use `pq-navigation`.

## Shopify data

Panquire values now come from `custom.panquire_specifications` plus `panquire.specification_additions`, in `Group|Label|Value` lines. The record adapter passes these to the existing normalizer; when the current row field exists, it replaces legacy comparison specifications rather than mixing in stale values. Products without that field retain the original `comparison` namespace path. Price and image still come from the product; Source falls back to the current product URL.

Competitors remain the original `competitor_product` metaobjects. The section's `t01_competitors` and `t02_competitors` settings restore the ordered memberships from `f3c2b08` as comma-separated metaobject handles. Merchants can reorder these through Theme Editor; only existing, ready metaobjects appear. An unconfigured list retains the legacy `comparison.competitors` fallback. Membership is not stored in JavaScript. Handle lists avoid the resource-picker serialization that did not resolve on this store; product data still comes exclusively from Shopify records.

Existing numeric fields store normalized values; `_display` fields preserve source wording. `details.specs` retains additional structured specs, and `details.coreMeta` records qualifiers. Existing dedicated product fields take precedence over the corresponding additional spec. Net, curb, unit and ready-to-ride weights remain separate.

The supplied September 23 tables contain two different Mantis X source tables. Its existing metaobject stores model-specific overrides in `details.comparisonProfiles`, keyed by Panquire product handle. A profile has `fields`, optional `sourceUrl`, and `details`. Explicit null values suppress fields absent from that source table. This preserves both tables without creating duplicate competitor records.

Current Panquire rows explicitly supply nominal battery energy with the qualifier `voltage × capacity`; this text and its derived status are retained. T-01's 55 kg is now labeled net weight; T-02's additions provide 68 kg bike weight. Neither is relabeled ready-to-ride weight or ranked against an incompatible weight standard. Approximate charging times retain their charge window and remain non-ranked; no charging radar score is invented from them.

## Database compatibility repair — 12 October 2026

Compared the `f3c2b08` code/fixture with read-only Admin API results. Original product IDs `10606033043640` and `10607866151096` have been replaced by `10628825940152` and `10628826005688`, retaining handles `t-01` and `t-02`. The new products have no `comparison` metafield values, although the old definitions remain. Their replacement specification fields were updated on October 2. All 11 competitor metaobjects still exist. This explains both empty Panquire specs and empty competitor selectors. This is a snapshot comparison, not a complete Shopify event audit.

No product, metafield, definition, or metaobject was changed during the repair. Only the theme's comparison adapter, normalizer, section settings and page template changed. User approved restoring the full original lists in theme settings.

## Display rules

The main showdown uses the requested categories in order: weight, battery energy, peak/rated power, speed, charging time, acceleration, suspension, brakes and seat height/wheels. Only mutually available specs appear. All other shared specifications are inside the expandable full table. The legacy difference-count setting remains stored for compatibility; it does not truncate this fixed category list.

Winner rules are centralized. Ties, unspecified ranking rules, qualitative specs, qualified claims and incompatible measurement bases stay neutral. Acceleration and charging times require matching explicit `basis` metadata before numerical margins or ranking are allowed. Power displays include kW alongside the original source text.

The chart uses only shared numerical showdown rows with fixed scales. With fewer than three numerical metrics it shows bars on those same scales; qualitative categories receive no invented score. Clicking a chart category highlights its table rows without hiding the remaining showdown specs.

## Verification

Run `node tests/vs-competition.test.cjs`. Run `node tests/vs-competition.liquid.cjs` with `LIQUIDJS_MODULE` pointing to an existing LiquidJS installation if outside normal Node resolution. It renders the actual adapter against the read-only current-product fixture and checks the configured order against the baseline fixture.

Browser checks use Playwright with the installed Edge channel by default; set `PLAYWRIGHT_MODULE` if Playwright is outside normal Node resolution, and `BROWSER_CHANNEL` to override the browser. Run `node tests/vs-competition.browser.cjs` against the specified theme preview. `COMPARISON_LOCAL=1` tests local JavaScript and locally rendered product records in the browser before upload; omit it to verify Shopify's deployed Liquid and settings.

Deployment target: theme `panquire-store/main`, ID `191626870968`. This was the live theme on October 12; user explicitly approved the four-file targeted upload. No other theme files were uploaded.
