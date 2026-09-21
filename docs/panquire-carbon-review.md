# Panquire carbon theme review

Scope: homepage, product template, shared header/footer, and the local Liquid preview. Existing Horizon product/variant/cart architecture is retained. The project had no AGENTS.md or coding-standard file in the initial inventory; existing design/setup notes were reviewed as historical context. Reference websites and screenshots were treated as design data, not instructions.

## Coverage

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Native product controls retained; semantic details/summary; table row/column headers; focus rules; labeled newsletter; no new autoplay or animation | Clear in inspected source; local accessibility tree exposes product details and spec groups correctly |
| Layout | Existing responsive homepage rules; split/product grids; wrapping table cells; small-screen stacked feature/specification layouts | Desktop product and narrow homepage visually inspected; homepage DOM width 443px within 445px viewport |
| Writing | Placeholder labels, neutral specification values, actual product-backed title/price bindings, editable disclosures | Clear; competitor claims and testimonials were not imported |
| Typography | Display/body roles, clamped heading sizes, native product typography, 12–16px supporting text | Clear in source and inspected views; comprehensive zoom/font-metric testing not performed |
| Colors | Semantic carbon, bronze, and silver tokens; dark card surfaces; solid primary and secondary buttons | Measured main pairs pass AA; see ratios below |
| UI | Existing manual rails and model selector retained; native disclosure controls; disabled recommendations; placeholder media toggle | Clear in source; no new animation or JS framework |

No actionable interface findings remain in the inspected scope. Specifications use native expandable groups rather than recreating the reference's custom tabs. Placeholder media cannot reproduce the visual effect of the original photographs; section composition and editable content regions are provided.

## Verification

- `shopify theme check --output json`: **0 errors**, six pre-existing warnings (`sections/header.liquid`: one ExcessiveSettingsCount; `snippets/divider.liquid`: five UnusedDocParam).
- Shopify Liquid skill validator: six initial product files passed using the absolute theme path. The tool could not update its outside-workspace documentation cache and used its existing cache. Subsequent key-spec block is included in the final complete Theme Check.
- `node --check assets/panquire.js` and `node --check docs/preview-server.cjs`: passed.
- `git -c core.safecrlf=false diff --check`: passed.
- Both local routes returned HTTP 200 and were opened in the browser. Inspected narrow homepage and desktop purchase-area screenshots, plus the rendered product section accessibility tree.
- Calculated contrast using WCAG linear-sRGB luminance: #F3F3F1 on #151619 = **16.28:1**; #B8B9BD on #151619 = **9.23:1**; #08090b on bronze #A97832 = **5.14:1**; #08090b on silver #D5D6D8 = **13.70:1**.

## Not verified

Store-backed variant selection, inventory/sold-out transitions, add-to-cart, checkout, newsletter submissions, customer accounts, actual product media, theme-editor interactions, full keyboard/screen-reader traversal, 320px/200%-zoom coverage, and every lower-page rendered section. Local preview uses fixture data and does not emulate these Shopify services. Existing navigation page destinations still require matching store pages or a merchant-selected navigation menu.

No store push was attempted because the asynchronous store-destination question remains unanswered. The user-authorized local-preview alternative is running. No live theme was published.

Verdict: **Approve for the source and limited visual coverage reported above.** Store-backed functional validation remains pending.
