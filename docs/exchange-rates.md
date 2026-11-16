# Panquire exchange-rate refresh

The theme reads the shop-level JSON metafield `panquire.exchange_rates` from Liquid. It stores the USD base, Frankfurter source date, the last successful refresh timestamp, rates, and per-currency source dates. Storefront code sends zero rate requests. Shopify still handles the country-selection form and persists the market between pages. The page also applies the chosen display currency immediately while Shopify processes the form.

## Enable the daily refresh

1. In the Shopify Dev Dashboard, create a custom app in Panquire's organization and install it on Panquire. Use an app permitted to read the shop and write the merchant-owned shop metafield. Verify that it can read this metafield with the Admin GraphQL API before scheduling it. [Shopify client credentials](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant) · [Shopify metafield permissions](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metafieldsSet)
2. In `pancodecake/panquire-store`, open **Settings → Secrets and variables → Actions**. Store the Shopify app client ID and secret as `SHOPIFY_FX_CLIENT_ID` and `SHOPIFY_FX_CLIENT_SECRET`. Keep credentials out of Liquid, theme files, Git, and logs.
3. Run **Refresh Shopify exchange rates** once from **Actions**. Confirm the successful run and check that a new storefront response contains the updated `refreshedAt` value in the `PanquireExchangeRates` script. Shopify may briefly serve cached HTML with the previous snapshot. A subsequent navigation receives the newer snapshot once Shopify refreshes its cache.

The workflow is scheduled daily at 08:17 UTC (16:17 China time). GitHub can delay scheduled runs or suspend schedules in inactive public repositories. The same Node 22+ script can run at the same cadence from a managed scheduler with the two secrets injected into its environment. Use one scheduler. [GitHub schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

Each run makes one Frankfurter request and requests a short-lived Admin API token. It validates the data before writing, preserves newer individual quotes from the existing snapshot where appropriate, and uses Shopify’s compare-and-set feature to avoid overwriting another updater's work. A failed run leaves the previous snapshot intact. The storefront displays original USD values if a selected rate is missing or its individual source date is seven days old. [Frankfurter reference rates](https://frankfurter.dev/)
