import { StandardEvents } from '@shopify/events';

let latestSelection;

document.addEventListener(StandardEvents.productSelect, (event) => {
  if (!(event.target instanceof Element) || !event.target.closest('.product-information') ||
      event.target.closest('product-card, dialog')) return;

  const price = document.querySelector('[data-t01-guide-price]');
  if (!price || !event.promise) return;

  const selection = event.promise;
  latestSelection = selection;
  selection.then(({ detail }) => {
    if (latestSelection !== selection || !price.isConnected || detail?.productId !== price.dataset.t01GuidePrice) return;

    const updated = detail.html?.querySelector('[data-t01-guide-price]');
    if (updated?.dataset.t01GuidePrice === price.dataset.t01GuidePrice) {
      price.replaceChildren(...updated.childNodes);
    }
  }).catch((error) => {
    if (error?.name !== 'AbortError') console.warn('[pq-t01-guide-price] Could not update the guide price:', error);
  });
});
