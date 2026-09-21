# Panquire homepage and product theme

Native Shopify Online Store 2.0, built on the existing Horizon theme. Homepage composition follows the supplied Freego screenshot; product composition follows the supplied Qronge screenshot. The same homepage header and footer render on both pages. No competitor images are included.

## Local preview

- Homepage: http://127.0.0.1:9393/
- Product: http://127.0.0.1:9393/products/preview

The local helper renders the actual Liquid sections and native product blocks with sample product data. It is not a separate storefront. Shopify-only forms, variant server responses, cart, checkout, account pages, and live product data require a store-backed preview. The preview banner and sample product never upload to Shopify.

Restart from this theme directory:

```powershell
npm install --prefix .preview-runtime liquidjs --no-audit --no-fund
node docs/preview-server.cjs
```

## Editing in Shopify

### New information pages and footer

Local previews: `/pages/about`, `/pages/partners`, `/pages/terms`, and `/pages/contact` on http://127.0.0.1:9393.

On Shopify, create Page records with handles **about**, **partners**, **terms**, and **contact** and assign the corresponding `page.about`, `page.partners`, `page.terms`, and `page.contact` templates. Templates alone do not create Page records. The existing pages can be assigned these templates if they already exist. Privacy Policy points to Shopify's native `/policies/privacy-policy`; add the actual policy in Shopify or choose a different footer URL.

- **About:** four editable chapter blocks, each with its own heading, rich text, transition sentence, desktop background, and optional mobile crop. The text is an editable brand-story draft, without invented founders, dates, or team biographies. Backgrounds remain atmospheric placeholders. Uploaded images receive grayscale/dark overlays and soft edge fades automatically. Reveals and modest parallax respect reduced motion; all text is visible without JavaScript.
- **Partners:** three blocks contain Partners, Affiliate Program Terms (all five subsections), and Corporate Purchase (all eight subsections). Preserve the `partners`, `affiliate-terms`, and `corporate-purchase` anchors so footer links continue to work. The Affiliate Program link also resolves to the affiliate section.
- **Terms:** four nested **Policy topic** blocks contain 59 individually editable **Policy question** blocks. Keep one of each topic: Payment (12), Shipping (13), Warranty (18), Returns and Refunds (16). Edit question/answer text in the theme editor; search automatically includes edits. Results are counted across all topics, with per-tab counts and automatic selection of a matching topic. Matching answers expand and matching text is highlighted. Clear resets search and accordion state. Arrow keys, Home, and End navigate tabs; Enter/Space operate native accordion summaries.
- **Footer:** Shop, Company, Business & Partners, Customer Care. Select two real products in the Shop block to turn placeholder names into product links. Each column can use a Shopify navigation menu instead of its default links. Legal labels, privacy/contact destinations, and copyright wording are editable; year and brand name are automatic.
- **Contact:** reuses Horizon's existing contact-form block. Form delivery works on Shopify, not the local preview. No form was submitted during development. This standard contact form has no attachment upload; the policy's photo/video upload process requires a separate supported workflow.

### Supplied content still needing decisions

Affiliate rate `[X%]`, attribution window `[X days]`, and `[Not specified in source]` answers remain as provided. Warranty exclusion entries marked **No** are preserved without guessing their meaning. Source questionnaire option lists are also retained. Shipping display was set to **shown at checkout**, as explicitly permitted by the brief. The supplied disposal wording and statutory-rights placeholders have not been rewritten or independently validated. This implementation formats supplied content; it does not certify it as a complete legal policy. Review/edit those values before using the pages as final store policy.

1. Open the theme editor and choose **Home page** or **Products → Default product**.
2. Select any Panquire section to edit headings, copy, spacing, placeholder media, and links. Add, remove, and reorder sections without editing code.
3. In **Theme settings → Panquire storefront**, edit the carbon background, bronze primary, silver secondary, border, and text/surface colors. Bronze is reserved for primary actions and selected states; silver is the secondary action color.
4. In **Header**, choose a Shopify navigation menu. The existing configurable page links remain the fallback. Configure those links only to pages that exist in your store.
5. In **Footer**, add navigation menus to the four columns, edit contact text, and add social links. Policy links automatically use the store's configured policies.

### Homepage

- Hero: up to five slides; image, text, text color, link, and desktop aspect ratio.
- Product feature: campaign image/height, model blocks, product assignment, model specifications.
- Product cards: assign real products to get native titles, prices, and product URLs. Until assigned, cards show placeholders.
- Tiles, promotions, reviews, journal, newsletter: select each block to edit. Reviews remain explicitly labeled placeholders until genuine content is entered.

### Product page

- **Product information → Product media → Show placeholder media**: turn off to use your own Shopify product media, native gallery, zoom, and video support.
- Native product title, description, pricing, variants, quantity and availability come from **Products** in Shopify Admin. Do not enter pricing in theme copy.
- **Panquire key specs**: one line per specification, `Label | Value`.
- **Panquire product details**: edit shipping, warranty, and included-items disclosures. These are neutral placeholders until you enter your actual terms.
- **Panquire product story**: panoramic, centered editorial, or split layout; optional uploaded video with native controls; editable media height and spacing.
- **Panquire feature mosaic**: image, heading, text, and optional feature/review link per block.
- **Panquire specifications**: editable size diagram and groups; one specification per line, `Label | Value`. Native disclosures work without JavaScript.
- **Panquire model comparison**: edit both model names/images and each comparison row independently.
- The native related-products section remains available but disabled by default to match the supplied composition.

Sections on the default product template are shared by all products using it. For different model stories/specifications, create another product template in the theme editor and assign it to that product. Product titles, prices, inventory, options, and descriptions are already product-specific.

## Unpublished upload

The local implementation is complete. Upload waits for confirmation of the intended store; no theme was published or pushed in this task.

```powershell
shopify theme push --unpublished --theme "Panquire Carbon Reference" --store YOUR-STORE.myshopify.com --strict --json
```

`.shopifyignore` excludes the local preview runtime, reference extraction, and development documentation. Keep the existing Horizon assets: native product, collection, search, cart, localization, and checkout behavior depend on them.
