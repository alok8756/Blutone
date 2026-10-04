// Thin client for the Blutone backend (Express + MongoDB).
// Every endpoint returns the uniform envelope `{ success, data, meta? }`; these
// helpers unwrap `data` so callers get the payload directly. The API already
// returns the exact shapes the UI consumes (see backend serializers), so the
// values here are drop-in replacements for the old hardcoded constants.

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

// --- Auth token (JWT) ---------------------------------------------------------
// Held in memory + localStorage; attached as `Authorization: Bearer` to every
// request once set. The AuthProvider owns its lifecycle (set on login / clear
// on logout); the client just reads it here.
const TOKEN_KEY = 'bt_token';
let authToken = (typeof localStorage !== 'undefined' && localStorage.getItem(TOKEN_KEY)) || null;

export function setAuthToken(token) {
  authToken = token || null;
  if (typeof localStorage === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getAuthToken() {
  return authToken;
}

function authHeaders(extra) {
  const h = { ...extra };
  if (authToken) h.Authorization = `Bearer ${authToken}`;
  return h;
}

async function parse(res) {
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Bad response from server (${res.status}).`);
  }
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error?.message || `Request failed (${res.status}).`);
  }
  return json.data;
}

async function get(path) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }
  return parse(res);
}

function send(method, path, body) {
  return (async () => {
    let res;
    try {
      res = await fetch(`${BASE}${path}`, {
        method,
        headers: authHeaders(body !== undefined ? { 'Content-Type': 'application/json' } : undefined),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error('Cannot reach the server. Is the backend running?');
    }
    return parse(res);
  })();
}

const post = (path, body) => send('POST', path, body || {});
const patch = (path, body) => send('PATCH', path, body || {});
const del = (path) => send('DELETE', path);

/** Full envelope (data + meta) for endpoints whose meta the UI needs. */
async function getWithMeta(path) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }
  let json;
  try { json = await res.json(); } catch { throw new Error(`Bad response from server (${res.status}).`); }
  if (!res.ok || json?.success === false) throw new Error(json?.error?.message || `Request failed (${res.status}).`);
  return json;
}

// Cache GETs that are effectively static for a session (home content,
// category list) so components that need them on every page share one request.
const cache = new Map();
function getCached(path) {
  if (!cache.has(path)) {
    cache.set(path, get(path).catch((err) => { cache.delete(path); throw err; }));
  }
  return cache.get(path);
}

function qs(params) {
  const s = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.set(k, v);
  });
  const str = s.toString();
  return str ? `?${str}` : '';
}

/** Aggregated Home payload: { categories, newArrivals, bestSellers, stats, shopRows }. */
export const getHome = () => getCached('/home');

/** All active categories (cached). */
export const getCategories = () => getCached('/categories');

/** Products, optionally narrowed: { category, tag, page, limit }. */
export const getProducts = (opts) => get(`/products${qs(opts)}`);

/**
 * Filter facets for a listing scope: { category } | { group } | {} (all).
 * -> { size:{options}, fabric:{options:[{label,count}]}, length:{options:[{label,count}]}, price:{min,max,currency} }.
 * Powers the FILTERS modal's per-option counts (e.g. "Cotton (14)").
 */
export const getFilters = (opts) => get(`/products/filters${qs(opts)}`);

/** Every published product. */
export const getAllProducts = () => get('/products');

/** All products in a category by slug. */
export const getProductsByCategory = (slug) => get(`/products/category/${encodeURIComponent(slug)}`);

/** Free-text search across title / colour / category / tag. */
export const searchProducts = (q) => get(`/products/search${qs({ q })}`);

/** Autosuggest keyword strings for the search bar. */
export const getSuggestions = (q, limit = 6) => get(`/products/suggest${qs({ q, limit })}`);

/**
 * Full product detail (PDP) by slug. Cached for the session: the PDP's colour
 * swatches are sibling products, so switching colour back and forth would
 * otherwise re-fetch the same payloads and re-delay the gallery each time.
 */
export const getProduct = (slug) => getCached(`/products/${encodeURIComponent(slug)}`);

/** Warm the browser image cache for a set of URLs. No API call, fire-and-forget. */
export function prefetchImages(urls) {
  (urls || []).slice(0, 3).forEach((src) => { if (src) new Image().src = src; });
}

/**
 * Warm everything a colour switch needs, before it's needed — called when a
 * swatch is hovered (desktop) or touched (mobile). PDP swatches carry their own
 * gallery, so the photos start downloading with no round-trip at all; the detail
 * payload is warmed alongside for sizes/specs/description.
 *
 * @param {object|string} swatchOrSlug a `colors[i]` swatch, or a bare slug
 */
export function prefetchProduct(swatchOrSlug) {
  const swatch = typeof swatchOrSlug === 'object' ? swatchOrSlug : null;
  const slug = swatch ? swatch.id : swatchOrSlug;
  if (!slug) return;
  if (swatch) prefetchImages(swatch.images);
  getProduct(slug)
    .then((p) => prefetchImages(p?.images))
    .catch(() => {}); // a failed prefetch is silent — the click will retry
}

/** Submit a bulk-order enquiry (home "ORDER IN BULK" form). name+phone required. */
export const submitBulkOrder = (payload) => post('/bulk-orders', payload);

// --- Auth (phone + OTP login via MSG91) --------------------------------------

/** Send an OTP to a 10-digit Indian mobile number. -> { phone, sent }. */
export const sendOtp = (phone) => post('/auth/send-otp', { phone });

/** Resend the OTP for a number mid-login. -> { phone, sent }. */
export const resendOtp = (phone) => post('/auth/resend-otp', { phone });

/** Verify the OTP. On success -> { token, user, isNewUser }. */
export const verifyOtp = (phone, otp) => post('/auth/verify-otp', { phone, otp });

/** Current user from the stored token (session restore). -> { user }. */
export const getMe = () => get('/auth/me');

/** Update profile (name + address). Phone is immutable server-side. -> { user }. */
export const updateProfile = (payload) => patch('/auth/me', payload);

// --- Wishlist (auth required) ------------------------------------------------

/** The signed-in user's wishlist (hydrated product cards). -> array. */
export const getWishlist = () => get('/wishlist');

/** Add a product to the wishlist. -> updated array. */
export const addWishlist = (slug, size) => post('/wishlist', { slug, size });

/** Remove a product from the wishlist by slug. -> updated array. */
export const removeWishlist = (slug) => del(`/wishlist/${encodeURIComponent(slug)}`);

// --- Help (public, configurable) ---------------------------------------------

/** Configurable help content: { title, subtitle, contacts, faqs }. */
export const getHelp = () => get('/help');

// --- Payments (Razorpay, auth required) --------------------------------------

/** Create a Razorpay order from cart line refs. -> { orderId, razorpayOrderId, amount, currency, keyId, mock, prefill, summary }. */
export const createRazorpayOrder = (payload) => post('/payments/razorpay/order', payload);

/** Verify a completed payment. -> { orderId, status, paymentStatus, ... }. */
export const verifyRazorpayPayment = (payload) => post('/payments/razorpay/verify', payload);

/** Place a Cash on Delivery order from cart line refs. -> { orderId, method, status, amount }. */
export const placeCodOrder = (payload) => post('/payments/cod', payload);

// --- Orders (auth required) --------------------------------------------------

/** The signed-in user's placed orders (newest first). */
export const getOrders = () => get('/orders');

/** Full detail for one order (incl. tracking timeline). */
export const getOrder = (id) => get(`/orders/${encodeURIComponent(id)}`);

/** Admin: change an order's fulfilment status (shipped / delivered / cancelled). */
export const updateOrderStatus = (id, status) => patch(`/orders/${encodeURIComponent(id)}/status`, { status });
