# VS Competition

The existing `/pages/compare` page uses `sections/vs-competition.liquid`, the shared record adapter, and the comparison CSS/JavaScript. The desktop and mobile header both use `pq-navigation`.

## Shopify data

Panquire values belong to product metafields in the existing `comparison` namespace. Competitors remain `competitor_product` metaobjects. `comparison.competitors` is an ordered list of metaobject references: this controls membership and the first competitor selected when changing Panquire models. No frontend model-specific membership arrays are used.

Existing numeric fields store normalized values; `_display` fields preserve source wording. `details.specs` retains additional structured specs, and `details.coreMeta` records qualifiers. Existing dedicated product fields take precedence over the corresponding additional spec. Net, curb, unit and ready-to-ride weights remain separate.

The supplied September 23 tables contain two different Mantis X source tables. Its existing metaobject stores model-specific overrides in `details.comparisonProfiles`, keyed by Panquire product handle. A profile has `fields`, optional `sourceUrl`, and `details`. Explicit null values suppress fields absent from that source table. This preserves both tables without creating duplicate competitor records.

T-02 has no supplied price, battery energy or numeric weight. Do not infer those values. The 72 V / 41 Ah battery has not been silently converted to a manufacturer energy claim.

## Display rules

The main showdown uses the requested categories in order: weight, battery energy, peak/rated power, speed, charging time, acceleration, suspension, brakes and seat height/wheels. Only mutually available specs appear. All other shared specifications are inside the expandable full table. The legacy difference-count setting remains stored for compatibility; it does not truncate this fixed category list.

Winner rules are centralized. Ties, unspecified ranking rules, qualitative specs, qualified claims and incompatible measurement bases stay neutral. Acceleration and charging times require matching explicit `basis` metadata before numerical margins or ranking are allowed. Power displays include kW alongside the original source text.

The chart uses only shared numerical showdown rows with fixed scales. With fewer than three numerical metrics it shows bars on those same scales; qualitative categories receive no invented score. Clicking a chart category highlights its table rows without hiding the remaining showdown specs.

## Verification

Run `node tests/vs-competition.test.cjs`. Browser checks use Playwright with the installed Edge channel by default; set `PLAYWRIGHT_MODULE` if Playwright is outside normal Node resolution, and `BROWSER_CHANNEL` to override the browser. Run `node tests/vs-competition.browser.cjs` against the specified theme preview.

Deployment target: theme `panquire-store/main`, ID `191626870968`. It was unpublished during verification; the public site used Horizon. Publishing a theme is a separate store action.
