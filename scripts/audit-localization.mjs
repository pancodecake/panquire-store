import { readFile } from 'node:fs/promises';

const ignoredKey = /^(?:handle|internal_label|display_preferences|link|secondary_link|image(?:_\d+)?|video(?:_\d+)?|asset|anchor|url|phone_number|support_email|(?:facebook|instagram|youtube)_url)$/i;
const nonCopyValue = /^(?:gid:|shopify:|https?:|mailto:|[\[{]|\/(?:pages|collections|products)\/|#[\w-]+$)/i;

function hasCopy({ key, value }) {
  const field = key.split(':')[0].split('.').at(-1);
  const copy = value?.trim();
  if (!copy || ignoredKey.test(field) || nonCopyValue.test(copy)) return false;
  const words = copy.replace(/<[^>]+>/g, ' ')
    .replace(/\b(?:Panquire|Shopify|Oceanpayment|T-0[1-4]|USD|EUR|km\/h|mph|kWh|Wh|kW|Ah|kg|lbs?|mm|cm|km|[VA])\b/gi, '');
  return /\p{L}{2}/u.test(words);
}

function audit(resources, locales) {
  const components = new Map();
  for (const resource of resources) {
    const component = resource.kind === 'ONLINE_STORE_THEME_JSON_TEMPLATE' && resource.resourceId.includes('/index?')
      ? 'Homepage theme settings' : resource.kind;
    for (const locale of locales) {
      const key = component + '|' + locale;
      if (!components.has(key)) components.set(key, { component, locale, sources: 0, current: 0, missing: 0, outdated: 0, identical: 0, gaps: [] });
      const row = components.get(key);
      for (const field of resource.translatableContent.filter(hasCopy)) {
        row.sources++;
        const translation = resource.locales?.[locale]?.find(item => item.key === field.key);
        let status;
        if (locale === field.locale) row.current++;
        else if (translation?.outdated) status = 'outdated';
        else if (!translation?.value?.trim()) status = 'missing';
        else if (translation.value === field.value) status = 'identical';
        else row.current++;
        if (status) {
          row[status]++;
          row.gaps.push({ resource: resource.resourceId, key: field.key, status });
        }
      }
    }
  }
  return Array.from(components.values());
}

async function liveSnapshot() {
  const shop = process.env.PANQUIRE_SHOP_DOMAIN;
  const token = process.env.PANQUIRE_ADMIN_TOKEN;
  if (!/^[a-z\d][a-z\d-]*\.myshopify\.com$/i.test(shop || '') || !token) {
    throw new Error('Set PANQUIRE_SHOP_DOMAIN and PANQUIRE_ADMIN_TOKEN for a read-only Shopify Admin app.');
  }
  const endpoint = `https://${shop}/admin/api/2026-10/graphql.json`;
  async function graph(query, variables) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(45_000),
    });
    const result = await response.json();
    if (!response.ok || result.errors?.length) throw new Error(result.errors?.map(error => error.message).join(', ') || `HTTP ${response.status}`);
    return result.data;
  }
  const definitions = await graph('{ shopLocales { locale published } types: __type(name: "TranslatableResourceType") { enumValues { name } } }');
  const locales = definitions.shopLocales.filter(locale => locale.published).map(locale => locale.locale);
  const aliasFields = locales.map((locale, index) => `l${index}: translations(locale:${JSON.stringify(locale)}) { key value outdated }`).join(' ');
  const resources = [];
  const unsupported = [];
  for (const { name: kind } of definitions.types.enumValues) {
    let after = null;
    try {
      do {
        const data = await graph(`query PanquireLocalizationAudit($kind:TranslatableResourceType!, $after:String) {
          translatableResources(first: 20, resourceType: $kind, after: $after) {
            nodes { resourceId translatableContent { key value locale } ${aliasFields} }
            pageInfo { endCursor hasNextPage }
          }
        }`, { kind, after });
        const page = data.translatableResources;
        for (const node of page.nodes) {
          resources.push({
            kind, resourceId: node.resourceId, translatableContent: node.translatableContent,
            locales: Object.fromEntries(locales.map((locale, i) => [locale, node[`l${i}`]])),
          });
        }
        after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
      } while (after);
    } catch (error) {
      unsupported.push({ kind, message: error.message });
    }
  }
  return { locales, resources, unsupported };
}

const source = process.argv[2];
const snapshot = source ? JSON.parse(await readFile(source, 'utf8')) : await liveSnapshot();
const components = audit(snapshot.resources, snapshot.locales);
console.log(JSON.stringify({ components, unsupported: snapshot.unsupported || [] }, null, 2));
