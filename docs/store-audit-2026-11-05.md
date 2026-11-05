# Panquire website audit

Audited 5 November 2026 against the supplied deep-research report and the current Shopify store. Item 9 and Terms of Service work are assigned to the merchant. No policy or Terms content was changed by this audit.

## Implemented

- Enabled Shopify's existing related-product section in `templates/product.json` and added the same component to `templates/product.panquire.json`. It follows the product content, uses the current product as its source, and displays up to three recommendations in a responsive grid. All three published products currently use the `panquire` template.
- Added the actual 4284 × 5712 dimensions to both fallback images in `sections/pq-diagonal-hero.liquid`. This resolves two existing Theme Check errors and supplies intrinsic image dimensions.
- Reused the theme's native recommendation loader, product cards, prices, links, and lazy-loading behavior. No app, subscription, custom payment button, or new JavaScript dependency was added.

## Findings against the report

| Area | Finding and action |
| --- | --- |
| Theme architecture | Live theme 191626870968, `panquire-store/main`, is based on Horizon 4.1.4. JSON templates and theme/app blocks already exist; no OS 2.0 migration is needed. |
| Related products | The default template had a disabled section; the assigned Panquire template had none. Enabled both through existing theme functionality. |
| Complementary upsells | Catalog contains T-01, T-02, and T-03, with no separate accessory products. Included equipment is not a paid upsell. No accessory prices, compatibility, or inventory were invented. |
| Search and collection filtering | Collection/search templates already enable native filtering and sorting. Header search and the search-results components exist. Additional filter configuration can be managed with Shopify Search & Discovery if needed. |
| App inventory | Messaging, Shopify Claude Connector App, Shopify ChatGPT MCP App, Shopify CLI Connector App, Pxl: BG Remover, and Oceanpayment Connect were installed. No duplicate paid merchandising apps were found in this list. Installation alone does not establish payment activation. |
| Payments | Theme already has Shopify cart/checkout and accelerated-checkout integration. Admin reports no supported digital wallets. Gateway activation, approved card brands, and actual payment acceptance remain unverified. |
| Markets | Store currency and presentment currency are USD; configured shipping destinations are U.S. only. Adding currencies or countries would require business and provider decisions. |
| Inventory | Admin showed T-01: 250, T-02: 250, T-03: 0. These are system quantities, not verified physical stock. No quantities were changed. |
| Performance | Shopify's Themes dashboard displayed last-30-day LCP P75 of 1262 ms, INP P75 of 34 ms, and CLS of 0 at inspection. These are existing dashboard measurements, not a new Lighthouse run or proof of post-change performance. |
| Deployment | Shopify's GitHub connection popover explicitly identified repository `panquire-store`, branch `main`. Changes were prepared from commit `b359859179341aaf3af9f13171b8f228df87467d` in an isolated worktree. |

## Corrections to the research report

The supplied report is a generic implementation guide, and several examples should not be copied literally:

- Standard filters are available to all stores using a compatible theme; Advanced or Plus is not a prerequisite. See [Shopify's filter requirements](https://help.shopify.com/en/manual/online-store/storefront-search/search-and-discovery-filters).
- Related recommendations use the theme recommendations object and Ajax endpoint, and do not require a Plus-only Admin REST endpoint. See [Shopify's related-product guide](https://shopify.dev/docs/storefronts/themes/product-merchandising/recommendations/related-products).
- Activating an approved third-party payment provider is a store-owner setup task. A placeholder Oceanpayment button or hand-written payment-session mutation cannot activate it. See [Shopify's payment-provider setup](https://help.shopify.com/en/manual/payments/third-party-providers/configuring-providers).
- App blocks use the supported `@app` schema type. The existing theme supports this; the report's `@app blocks` example is not a valid replacement.
- A backup does not require unpublishing the storefront, and these changes do not require a DNS switch. Live code deployment follows this repository's GitHub-only rule.

## Verification and limitations

- Shopify CLI Theme Check: zero errors and seven existing warnings, all outside the changed files. Warnings concern section setting count, unused LiquidDoc parameters, and one unused variable.
- Both product templates parse and contain exactly one enabled related-product section, bound to the current product. Collection/search filtering and sorting remain enabled.
- Git diff whitespace checks passed. Existing purchase controls, prices, stock settings, and legal content were preserved.
- The bundled skill validator could not start because `@shopify/theme-check-common` was missing; the installed Shopify CLI's Theme Check supplied validation.
- Public HTTP verification received Shopify's connection-verification page. Computer Use subsequently stopped because it could not reliably identify the browser URL. Desktop/mobile rendering, recommendation requests, filter interactions, and checkout transactions still need a browser smoke test.
- Before changes, a full live-theme backup and store audit snapshot were saved in the original workspace's `.audit-2026-11-05` directory. Other in-progress work in that original workspace was not deployed.

## Merchant follow-ups outside item 9

1. In **Settings > Payments**, verify Oceanpayment is activated for this store and that the displayed card brands match the account's approvals. Oceanpayment Connect is already installed. Complete any remaining provider account verification yourself; no merchant credentials or payment settings were changed.
2. Test desktop and mobile checkout with the provider's supported test procedure, including success, decline, cancellation, and refund handling. Verify order/fulfillment notifications. No test orders, charges, refunds, or customer messages were created during this audit.
3. Confirm actual stock and the intended preorder behavior, particularly T-03's zero inventory and the T-01/T-02 preorder tags. Supply genuine accessory listings and model compatibility before enabling paid accessory upsells.
4. Confirm delivery destinations, handling/delivery estimates, carrier services, and battery/freight arrangements. Product purchase copy mentions worldwide shipping, while store settings permit U.S. destinations only. The purchase copy also contains one-year warranty wording, while the detailed policies describe two years. Decide the authoritative promises and align the copy as part of your policy work; this audit did not choose contractual terms for you.
5. Review the customer-facing store name: Shopify still reports `My Store`. Keep the registered legal entity distinct from the Panquire brand.
6. Check all three product pages on desktop/mobile: related cards should show other models, prices and links should work, and the original purchase panel should behave normally. Check search, collection filters, empty results, cart quantities, and checkout. If custom filters are desired, configure only attributes that have accurate product data in Search & Discovery.
7. Review Shopify's web-performance and conversion reports after normal traffic has reached the updated theme. No ongoing monitor was scheduled.

## Recovery

Revert the audit's theme commit through GitHub and push the reversal to the verified connected branch. Confirm Shopify synchronization after the reversal. Do not upload a theme backup directly to the live theme or force-push shared history.
