# Panquire VS Competition

Target: `pancodecake/panquire-store`, branch `main`; Shopify theme **panquire-store/main**, ID **191626870968** (unpublished). Page: `/pages/compare`, template `page.compare.json`.

## Data ownership

Panquire specifications are merchant-owned Product Metafields in `comparison`. Competition specifications are standalone `competitor_product` metaobjects. Store inspection found no existing definitions before these were created. Definitions are merchant-owned because this is a theme, not an installed app, and Shopify Admin and future integrations must be able to edit them.

T-01 is product `10606033043640`, handle `t-01`, with native price USD 2,000. Inventory tracking is enabled; no stock quantity was invented. T-02 has not been created, per the merchant's instruction. Its selector and missing-data state are already supported. Create a product with handle `t-02` to connect it automatically.

The renderer never contains product specifications. Liquid serializes Shopify records through `comparison-record.liquid`; `vs-competition.js` normalizes both sources before rendering. The `specs` map is the canonical interpretation of field names, units, groups and comparison eligibility. The adjacent `radarMetrics` configuration defines fixed display scales, not product facts.

## Shared fields

The following fields have type `number_decimal` on both sources. Product keys are prefixed with `comparison.`; metaobjects use the keys directly.

| Key | Unit |
| --- | --- |
| continuous_motor_power | W |
| peak_motor_power | W |
| maximum_speed | km/h |
| battery_voltage | V |
| battery_energy | kWh |
| battery_capacity | Ah |
| claimed_range | km |
| maximum_load | kg |
| ready_to_ride_weight | kg |
| front_wheel_size | inches |
| rear_wheel_size | inches |
| maximum_climbing_ability | degrees; numeric plot bound when qualified |
| charger_voltage | V |
| charger_amperage | A |

`claimed_range_display` and `maximum_climbing_ability_display` are `single_line_text_field` values that preserve source wording. `source_url` is a URL field.

For T-01, climbing is stored as numeric plotting bound `30` plus source claim `<30°`. Normalization deliberately returns no exact numeric value for a bounded claim, and the chart explains the bound. No climbing margin is calculated against an exact claim. Range conditions are displayed verbatim and range margins are not calculated. Battery energy uses two decimal places.

## Add a competitor

In Shopify Content > Metaobjects > Competition Product, create or edit a record:

1. Enter `name`, optional `brand`, `image` (image file reference), `price` (decimal), `currency` (ISO code such as USD), and `source_url`.
2. Enter only known specifications in their defined units. Leave unknown fields empty; zero means actual zero.
3. Preserve qualifications and test conditions in the display-text fields.
4. Set `ready` to true when the record is suitable for comparison. False records appear disabled with “coming soon”.

All accessible entries are enumerated from Shopify, without a JavaScript competitor list. Liquid pagination accommodates up to 250 entries per rendered page. This comfortably exceeds the initial six; a catalog beyond that size would need paginated loading.

Light Bee X is populated. Pro S (17"), Mantis X, RFN Ares, Falcon Lite and X1 Spark L contain only their supplied names and `ready: false`. No specifications or prices were invented for them.

## Theme Editor

The section exposes heading, supporting text, default Panquire product, default competitor, difference count, radar visibility, price visibility, Source visibility, initially expanded specifications, and competitor crimson. The current global palette contains bronze/carbon/silver but no red token, so crimson is scoped to this section. Fonts, surfaces, borders, container widths, mobile breakpoint and motion timing use the existing theme.

The Panquire selector is restricted to T-01 and T-02. Its default product setting should select one of those products. Invalid selections fall back safely.

URLs use `?panquire=t-01&competitor=light-bee-x`. Valid query values override section defaults; invalid or disabled records fall back to configured defaults, then T-01 / Light Bee X, then the first available record. Changing a selector preserves unrelated query parameters and fragments. Browser history changes are supported.

## Validation

Run `node --test --test-isolation=none tests/vs-competition.test.cjs` and `shopify theme check`.

The tests cover six exact source differences, numeric/display/radar separation, missing values versus zero, fixed scales and clamping, compound specifications, and URL safety. Source fixtures exist only in tests and are not delivered to storefront customers.

The radar has touch and keyboard-operable category controls. Solid bronze and dashed crimson distinguish the series without relying on color alone. Tables carry exact claims, including missing-value dashes, regardless of chart visibility. Missing radar values are omitted instead of plotted as zero. Scoped tables scroll on small screens without widening the page. Reduced motion disables transitions and chart interpolation.

## Deployment

Upload only the section, record snippet, two assets and page template to theme 191626870968 with `--nodelete`. Do not publish the theme as part of routine page updates. Shopify's GitHub integration may commit uploaded theme files back to `panquire-store/main`; fetch before committing further work.
