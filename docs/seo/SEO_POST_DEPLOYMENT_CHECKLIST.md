# Post-deployment checklist

Run after review and authorized GitHub-to-Shopify synchronization. This branch is not deployed.

## Release and purchase flow

- Confirm the intended branch is linked to the correct theme; record deployed commit/theme. Use approved GitHub workflow.
- Review home, dirt-bike collection, T-01/T-02/T-03 and comparison on mobile/desktop.
- Confirm collection guide appears after products only on the intended collection. Test price/currency changes in preview to verify current-price table and conditional USD budget text.
- Test comparison selectors, chart, source links and specification expansion. Disable JavaScript to inspect the new Panquire table.
- Verify gallery/video, variant/quantity controls, inventory messaging, cart, accelerated checkout and payment methods using the store's approved test-order process.

## SEO and rendering

- Inspect titles, descriptions, one H1 per priority page, and keyword ownership from SEO_KEYWORD_MAPPING.md.
- Check canonicals for products, variants, collection filters/sort and comparison parameters. Preserve valid localized canonicals.
- Check breadcrumb/product/collection/comparison/support links, focus visibility, disclosures and mobile overflow.
- Inspect rendered JSON-LD and use Google Rich Results Test on product URLs. Native Product/ProductGroup should remain; Organization/BreadcrumbList must match visible content. Check apps do not introduce duplicates.
- Do not invent ratings, FAQ eligibility, shipping/returns or certification facts to remove optional Google warnings.
- Fetch robots/sitemap, inspect priority sitemap URLs and crawl permissions. Sitemap membership does not prove indexation.

## Measurement and evidence

- In Search Console, inspect the five priority URLs and record index status/Google canonical/crawl findings. Request indexing only for eligible changes; confirm sitemap submission.
- Record US query/page impressions, clicks, CTR and position against a pre-release baseline. Do not add overlapping keyword estimates into a traffic target.
- Verify consent and view_item/add_to_cart/begin_checkout/purchase events. Use actual qualified engagement/funnel evidence and disclose small samples.
- Run mobile PSI and review LCP/INP/CLS field data where available. No performance score improvement has been claimed; new buying content adds HTML/CSS without new interactive JavaScript.
- Recheck product prices, stock, charging and policies as they change. Dynamic price text helps, but narrative specifications require editorial review.
- Resolve source-kit conflicts, tags and localization in SEO_UNRESOLVED_ITEMS.md. Publish first-hand tests/reviews only when evidence and permissions exist.
- Review early signals after release; no rankings or sales within 30 days are promised.
