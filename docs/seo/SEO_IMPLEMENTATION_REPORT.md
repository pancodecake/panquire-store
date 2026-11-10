# Panquire SEO implementation

10 November 2026. Repository: `pancodecake/panquire-store`. Branch: `codex/seo-optimization`, based on `39f99371a3e11e7b9a8fd92d4e729aff52e9dbf1`. Review branch only; no direct live-theme upload, merge or publication.

## Audit and decisions

Read the complete supplied SEO Optimization Plan and implementation brief. Reused the DataForSEO findings without purchasing duplicate research. Prioritized the existing adult collection, 60V T-01, 72V T-02 and comparison hub. Rejected unsupported acceleration, racing, road-legality, extreme-range and service-network assertions from the appended marketing hypotheses. Current first-party product pages supplied commercial facts. The preceding stock/shipping FAQ corrections are visible live and were not overwritten.

Firecrawl inspected home, collection, T-02, comparison, robots.txt and sitemap. A rendered Playwright browser independently inspected titles, H1s, canonicals and JSON-LD on four commercial pages. Native ProductGroup markup is present on the product page; no duplicate product schema was added. Public robots/sitemap were reachable and the four sampled canonicals were correct. Those functioning configurations were preserved.

| Finding | Impact / priority | Evidence | Response |
| --- | --- | --- | --- |
| Collection only had intro and grid | High / 1 | Current collection retrieval | Scoped buying guide with current-price table, selection guidance and five FAQs |
| No dedicated collection entry in shared navigation | High / 1 | Navigation source | Collection link shared by desktop/mobile, plus homepage CTA |
| Homepage retained 8 kW T-01 claim | High / 1 | Live homepage vs current product specifications | 9.5 kW correction; unsupported regenerative-braking copy replaced |
| Comparison had hidden generic H1 and little selection guidance | Medium / 2 | Rendered page/source | Visible alternatives heading and editorial guidance; interactive tool preserved |
| Custom header emitted no Organization identity | Medium / 2 | Rendered JSON-LD audit and header source | Organization node in custom header, native product provider preserved |
| Missing 37 default English purchase keys | High / 1 | 1,221 Theme Check translation errors | Restored current fallback defaults; neutral payment/model labels |
| Static T-03 fallback price was outdated | Medium / 2 | Source vs current product listing | Read actual product price; leave blank when unavailable |

## Implemented URLs

- `/collections/electric-dirt-bikes`: existing grid/filters followed by `pq-collection-guide`: live-price T-01/T-02 specification table, voltage/budget/fit/ownership guidance, five native-disclosure FAQs and product/comparison/support links. USD budget headings appear only while current prices meet the ceilings. No new guide on other collections or when either required model is absent.
- `/products/t-01`, `/products/t-02`: distinct model-selection context and cross-links. Existing galleries, purchase panel, metafield FAQs, media, checkout wiring and native product structured data preserved.
- `/pages/compare`: visible alternatives H1, introduction, editorial tradeoffs and a crawlable Panquire table. Existing selectors, radar, source links and specification tables remain. Cross-brand interaction still requires JavaScript; the added model-selection table does not.
- `/`: descriptive category CTA/copy, corrected T-01 power, documented power-level copy and qualified supported-destination shipping language. Hero media and existing review content retained.
- Commercial product/collection/comparison pages: visible breadcrumbs and matching BreadcrumbList JSON-LD. T-03 keeps its own title and direct breadcrumb, without forced dirt-bike category targeting.
- English metadata: distinct intent-aligned titles/descriptions and matching social metadata. Other-language merchant metadata preserved. HTTPS Open Graph image URL and description fallback corrected.

## Files

New: `assets/pq-buying-guide.css`, `sections/pq-collection-guide.liquid`; snippets `pq-dirt-bike-selection`, `pq-product-selection`, `pq-comparison-guide`, `pq-seo-breadcrumbs`, `pq-organization`; `tests/seo-render.cjs`, `tests/seo-browser.cjs`; design notes and five reports.

Updated: `templates/collection.json`, `templates/index.json`, `layout/theme.liquid`, `locales/en.default.json`; sections `pq-header`, `pq-product-editorial`, `vs-competition`; snippets `meta-tags`, `pq-navigation`, `pq-model-data`, `pq-model-comparison-static-cell`; existing purchase-panel test dependency selection/assertion scope.

The guide is attached to the default collection template and guarded by handle; no Admin template assignment is needed. Product/collection/policy records and applications were not changed through Admin.

## Validation

- Full Shopify CLI Theme Check: **0 errors, 8 existing warnings** after the default-translation repair. Warnings concern existing external analytics, settings count, unused documented parameters and an unused assignment.
- New Liquid render checks: passed price changes, USD budget boundaries, other currencies, missing products, page scope, metadata, localized metadata preservation, T-03 price, breadcrumbs and JSON-LD closing-tag escaping.
- Existing comparison/purchase tests: **14 passed**. Purchase assertion still rejects actual preorder stock claims, checkout gates and obsolete warranty wording while permitting policy references to separately agreed preorders.
- Nine local rendered component previews at **390, 768, 1440 px**: no horizontal overflow/empty links, one fixture H1, working native FAQ disclosures. Desktop/mobile screenshots visually inspected. These are fixture previews, not a Shopify development-theme or production checkout test.
- Bundled skill validator could not start because `@shopify/theme-check-common` is missing; Shopify CLI Theme Check ran successfully instead.

No ranking, traffic, revenue or CWV improvement is claimed. No unsupported standalone testing, legal or review article was fabricated. Remaining account/publication/evidence checks are in the companion reports.

Sources, audited 10 November: supplied SEO plan; [home](https://panquire.com/), [collection](https://panquire.com/collections/electric-dirt-bikes), [T-01](https://panquire.com/products/t-01), [T-02](https://panquire.com/products/t-02), [comparison](https://panquire.com/pages/compare), [robots](https://panquire.com/robots.txt), [sitemap](https://panquire.com/sitemap.xml). Page observations are snapshots, not a statement about subsequent publication.
