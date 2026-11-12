import { StandardEvents } from '@shopify/events';

let latestSelection;

document.addEventListener(StandardEvents.productSelect, (event) => {
  if (!(event.target instanceof Element) || !event.target.closest('.product-information') ||
      event.target.closest('product-card, dialog')) return;

  const price = document.querySelector('[data-product-guide-price]');
  if (!price || !event.promise) return;

  const selection = event.promise;
  latestSelection = selection;
  selection.then(({ detail }) => {
    if (latestSelection !== selection || !price.isConnected || detail?.productId !== price.dataset.productGuidePrice) return;

    const updated = detail.html?.querySelector('[data-product-guide-price]');
    if (updated?.dataset.productGuidePrice === price.dataset.productGuidePrice) {
      price.replaceChildren(...updated.childNodes);
    }
  }).catch((error) => {
    if (error?.name !== 'AbortError') console.warn('[pq-product-guide-price] Could not update the guide price:', error);
  });
});
