# Unresolved items and follow-up

| Item | Evidence / limit | Exact next step |
| --- | --- | --- |
| Deployment | Brief prohibits direct deployment/merging | Review branch/PR; verify actual Shopify-linked production branch before approving GitHub merge. Do not upload theme files directly |
| Full storefront integration | Local component renders checked at three widths; no development theme uploaded | After authorized GitHub synchronization, test full pages, media, selector/chart, cart, variants and accelerated checkout in Shopify preview |
| Search Console | No property/coverage access supplied | Open panquire.com property → URL Inspection for home/collection/T-01/T-02/compare; inspect canonical/indexing reason and sitemap submission. Missing brand results do not diagnose deindexing |
| Analytics / CWV | No verified conversion baseline, field CWV or PSI run | Verify commerce events and run mobile PSI after release; compare equivalent pages/methods before attributing performance changes |
| T-02 weight | Live 60 kg vs kit 68 kg curb | Obtain defined measured ready-to-ride weight before comparative superiority claims |
| Charging source kit | Live T-01 6A/about 5.2h; T-02 18A/about 4h, versus older 3.5h/6A kit conflicts | Confirm configuration and update manufacturer source documents; branch follows current product pages |
| Original riding evidence | No Panquire head-to-head acceleration/endurance/range test supplied | Produce test with rider/terrain/speed/weather/start-end charge, then publish the original asset |
| Shipping/returns schema | Destination terms and older policy materials differ | Confirm exact rates, return window and return-freight obligations before adding OfferShippingDetails/MerchantReturnPolicy |
| Legacy tags | Earlier product read showed Preorder tags despite current in-stock copy | Admin → Products → T-01/T-02 → Tags: review/remove stale Preorder tag if no longer applicable. Do not change real inventory merely for SEO |
| Admin SEO persistence | Theme supplies English overrides; stored merchant fields unchanged | Optionally mirror approved `snippets/meta-tags.liquid` values into each Product/Collection/Page Search engine listing for future theme portability |
| Localization | New buying guidance is English | Translate and review for actively marketed locales; verify reciprocal hreflang and genuinely equivalent content before expansion |
| Reviews | Existing reviews not independently authenticated | Merchant retains proof/permissions; no fabricated reviews or ratings were added |
| Validator warnings | Eight warnings in existing code patterns | Review analytics asset, settings count and unused definitions separately; do not remove working integrations without evidence |
| Optional validator installation | Bundled script lacks theme-check-common dependency | Repair skill packaging separately; Shopify CLI Theme Check ran successfully |

Robots.txt, sampled canonicals and the generated sitemap were working and remain. No legal/registration promises, cost articles without inputs, fabricated testing or external outreach messages were produced. No Admin product/policy records changed in this implementation task.
