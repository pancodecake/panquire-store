# Panquire Markets currency

The footer uses Shopify’s localization form and lists every country in `localization.available_countries`. Each option uses Shopify’s effective market currency and falls back to the store currency (USD) if the country has no currency. Product and cart prices come from Shopify’s already-localized Liquid values. Panquire’s comparison prices use Shopify’s formatted output. Competitor amounts remain in their published source currency.

[The 14 November 2026 country-to-currency snapshot](markets-currency-matrix.json) lists the 237 countries and regions exposed by the live store. Shopify Admin reported five active regional markets and USD as the sole enabled presentment currency. The snapshot is test data. The storefront selector always reads the current Shopify configuration.

## Shopify Admin

1. In **Online Store → Preferences → Automatic redirection**, enable **Country/region**. Shopify handles location matching and stores the country selected through the footer form. [Shopify’s redirection guide](https://help.shopify.com/en/manual/international/automatic-redirection)
2. In **Markets**, keep USD as the base currency. Where Shopify makes local pricing available, enable **Local currencies**, use **Dynamic** exchange rates, and turn **Rounding** off. Review existing catalog pricing and price adjustments so the amounts derive from the original USD prices. Configure USD as the market and backup fallback where applicable. Review shipping and fulfillment eligibility before activating or expanding any market. [Shopify’s currency settings](https://help.shopify.com/en/manual/markets/customizations/local-currencies)
3. In **Settings → Payments**, verify Oceanpayment’s activation and run a test checkout. Oceanpayment’s Shopify integration charges in the shop’s default currency, USD. A checkout with a supported primary gateway is needed to charge in the customer’s local currency. [Shopify gateway behavior](https://help.shopify.com/en/manual/international/payments) · [Oceanpayment FAQ](https://dev.oceanpayment.com/en/docs/saas/faq/)

## Exchange rates and fee

Shopify sources dynamic rates from financial markets and refreshes them throughout the day. Shopify does not publish a fixed refresh interval for standard Markets. Shopify documents no Shopify conversion fee for display-only conversions with a third-party gateway. With Shopify Payments, applicable conversion fees are included in dynamic prices. Manual rates can move the fee to the payout, but they require ongoing rate maintenance. [Shopify’s rate and fee calculation](https://help.shopify.com/en/manual/markets/customizations/local-currencies) · [Display-only conversions](https://help.shopify.com/en/manual/international/payments)

An external FX feed could show a mid-market estimate, clearly labeled as an estimate alongside the USD amount, with a cached rate, a timestamp, and a USD fallback. It cannot change the currency charged by Oceanpayment. Native local pricing with an eligible gateway is the route to matching storefront and checkout amounts. Shopify Payments for mainland China is invitation-only and requires merchant verification. [Shopify Payments eligibility for China](https://help.shopify.com/en/manual/payments/shopify-payments/supported-countries/china/requirements)

## Verification

Run `node --test tests/markets-currency.test.cjs` with LiquidJS available via `LIQUIDJS_MODULE` or the project’s local preview runtime. The test checks all entries in the snapshot, the USD fallback, and pass-through formatting at two-, zero-, and three-decimal precision. An updated JSON snapshot can be supplied through `PANQUIRE_MARKETS_MATRIX`.

The published selector matched all 237 rows. A live sweep verified country selection, USD cart currency, and both model prices for 43 countries before rate limiting prevented complete checks for the other 194. A separate Japan session retained its selection on T-01, T-02, T-03, the comparison page, and the cart. The T-04 URL returned HTTP 404. Shopify Theme Check reported zero errors.

The current USD-only configuration cannot exercise actual non-USD conversion, rounding, or cross-currency checkout. Once local currencies are enabled, compare the rendered T-01 and T-02 amounts to Shopify’s market price breakdown for USD 1,999 and USD 2,699. Verify the same price for the same variant on home and collection cards, on product and comparison pages, and in the cart. Check discounts, shipping rates, and the actual currency on the hosted checkout and provider page using a test payment. Test a fresh visit for automatic redirection and a subsequent visit for persistence of an explicit country selection.
