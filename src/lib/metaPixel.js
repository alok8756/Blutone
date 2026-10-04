// Meta (Facebook) Pixel — the single place the app talks to `window.fbq`.
//
// The base snippet lives in index.html (it must run before React so the first
// PageView is not lost). This module is the typed surface every component uses;
// nothing else in the app should call `window.fbq` directly.
//
// Every product event carries `content_ids` = the product's Content ID (SKU),
// which is what makes dynamic/catalog remarketing ads work: without it Meta
// knows *someone viewed a product*, not *which* product to re-show them.
// See src/lib/sku.js for how that ID is derived and src/data/products.js for
// the snapshot handed to Commerce Manager.

import { contentIdFor, productMeta } from '../data/products.js';

export const PIXEL_ID = '1867577427953385';
export const CURRENCY = 'INR';
const CONTENT_TYPE = 'product';

// Rolling log of everything sent, for QA (Pixel Helper shows the network side;
// this shows what the app *intended* to send, including events dropped because
// fbq had not loaded). Read it in DevTools: `window.__metaPixelLog`.
const LOG_LIMIT = 100;

function record(entry) {
  if (typeof window === 'undefined') return;
  const log = (window.__metaPixelLog = window.__metaPixelLog || []);
  log.push(entry);
  if (log.length > LOG_LIMIT) log.shift();
  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.log('[MetaPixel]', entry.event, entry.params || '');
  }
}

/** True once the base snippet has installed `fbq` (the stub counts — it queues). */
export function isReady() {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
}

/**
 * Send a standard Meta event. Never throws: an ad-blocker, a stripped snippet
 * or a server-render must not be able to break a checkout.
 */
export function track(event, params) {
  const sent = isReady();
  record({ event, params, sent, t: Date.now() });
  if (!sent) return false;
  try {
    if (params) window.fbq('track', event, params);
    else window.fbq('track', event);
    return true;
  } catch {
    return false;
  }
}

/** Send a non-standard (custom) event. Same guarantees as `track`. */
export function trackCustom(event, params) {
  const sent = isReady();
  record({ event, params, sent, custom: true, t: Date.now() });
  if (!sent) return false;
  try {
    window.fbq('trackCustom', event, params || {});
    return true;
  } catch {
    return false;
  }
}

export { contentIdFor };

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/**
 * The shared shape of a product event: Content ID + type + name + value.
 * Accepts anything carrying a slug — a PDP payload, a list card, a cart line.
 */
function productParams(product, { qty = 1, price } = {}) {
  const id = contentIdFor(product);
  const meta = productMeta(product);
  const unit = num(price ?? product?.price ?? meta?.price);
  return {
    content_ids: [id],
    content_type: CONTENT_TYPE,
    content_name: product?.title || product?.name || meta?.name || '',
    content_category: product?.categoryLabel || product?.category || meta?.category || '',
    contents: [{ id, quantity: qty, item_price: unit }],
    value: +(unit * qty).toFixed(2),
    currency: CURRENCY,
  };
}

/** Cart lines -> the multi-item shape used by InitiateCheckout / Purchase. */
function cartParams(items, total) {
  const list = (items || []).map((i) => ({
    id: contentIdFor(i),
    quantity: i.qty || 1,
    item_price: num(i.price),
  }));
  const value = total != null
    ? num(total)
    : +list.reduce((s, c) => s + c.item_price * c.quantity, 0).toFixed(2);
  return {
    content_ids: list.map((c) => c.id),
    content_type: CONTENT_TYPE,
    contents: list,
    num_items: list.reduce((s, c) => s + c.quantity, 0),
    value,
    currency: CURRENCY,
  };
}

/* -------------------------------------------------------------------------- */
/* Standard events                                                            */
/* -------------------------------------------------------------------------- */

export function trackPageView() {
  return track('PageView');
}

// React 18 StrictMode mounts effects twice in development, and a colour switch
// can re-run the PDP effect with the same product. Both would double-count a
// ViewContent, so identical product views inside this window collapse into one.
const DEDUPE_MS = 1200;
let lastView = { key: '', t: 0 };

/** PDP view. Fires on every route transition — no full page reload needed. */
export function trackViewContent(product, opts) {
  const id = contentIdFor(product);
  if (!id) return false;
  const now = Date.now();
  if (lastView.key === id && now - lastView.t < DEDUPE_MS) return false;
  lastView = { key: id, t: now };
  return track('ViewContent', productParams(product, opts));
}

/** "ADD TO BAG". `opts.qty` is the quantity the user actually chose. */
export function trackAddToCart(product, opts) {
  if (!contentIdFor(product)) return false;
  return track('AddToCart', productParams(product, opts));
}

/** Heart / wishlist toggle — only the "added" direction is an event. */
export function trackAddToWishlist(product, opts) {
  if (!contentIdFor(product)) return false;
  return track('AddToWishlist', productParams(product, opts));
}

/** Bag -> CHECKOUT. */
export function trackInitiateCheckout(items, total) {
  return track('InitiateCheckout', cartParams(items, total));
}

/** Payment method chosen (Razorpay / COD) on the payment page. */
export function trackAddPaymentInfo(items, total, method) {
  return track('AddPaymentInfo', { ...cartParams(items, total), payment_method: method || '' });
}

/** Order placed. `orderId` is passed as `eventID` so a future Conversions API
 *  server event for the same order is de-duplicated instead of double-counted. */
export function trackPurchase(items, total, { orderId, method } = {}) {
  const params = { ...cartParams(items, total), order_id: orderId || '', payment_method: method || '' };
  const sent = isReady();
  record({ event: 'Purchase', params, sent, t: Date.now() });
  if (!sent) return false;
  try {
    window.fbq('track', 'Purchase', params, orderId ? { eventID: String(orderId) } : undefined);
    return true;
  } catch {
    return false;
  }
}

/** Search box / `?q=` listing. */
export function trackSearch(query, results) {
  return track('Search', {
    search_string: String(query || ''),
    content_type: CONTENT_TYPE,
    content_ids: (results || []).slice(0, 20).map((p) => contentIdFor(p)).filter(Boolean),
  });
}

/** Category / group listing view. */
export function trackViewCategory(name, results) {
  return track('ViewCategory', {
    content_name: String(name || ''),
    content_category: String(name || ''),
    content_type: CONTENT_TYPE,
    content_ids: (results || []).slice(0, 20).map((p) => contentIdFor(p)).filter(Boolean),
  });
}

/** Phone-OTP login completed. */
export function trackCompleteRegistration(isNewUser) {
  return track('CompleteRegistration', { status: isNewUser ? 'new' : 'returning', currency: CURRENCY });
}

/** Bulk-order enquiry submitted (the home "ORDER IN BULK" form). */
export function trackLead(source) {
  return track('Lead', { content_name: source || 'Bulk Order', currency: CURRENCY });
}
