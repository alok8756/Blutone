// Per-product option data (sizes, colours, gallery images).
//
// HARDCODED placeholder data — when the API is ready, each product's
// `sizes`, `colors` and `images` will come from the product-details response.
// `sizesFor` / `colorsFor` / `imagesFor` already prefer fields on the product
// object, so swapping in real data is just a matter of populating them.

// Every product has these 6 sizes (matches the backend PRODUCT_SIZES and the DB
// variants). Only used as a fallback when the product-details API returns no
// sizes — sizesFor() prefers the real product.sizes from the API.
export const SIZES = ['M', 'L', 'XL', '2XL', '3XL', '4XL'];

// The 12 selectable colours for the "Select Colors" grid (2 rows × 6).
//
// The first four are EXACT values sampled from the Figma swatches on the
// Product page (node 190:1399) — do not change these. Figma leaves the other
// eight circles as empty placeholders, so they are filled here with the common
// leggings colours used across the catalogue (data.js). These eight are
// HARDCODED placeholders until the API returns real per-product colours
// (colorsFor() already prefers a product.colors field).
export const SWATCHES = [
  { name: 'Golden Yellow', hex: '#FFCC00' }, // Figma 190:1432 (exact)
  { name: 'Red', hex: '#FA2307' },           // Figma 190:1433 (exact)
  { name: 'Green', hex: '#09E638' },         // Figma 190:1434 (exact)
  { name: 'Magenta', hex: '#DE14C3' },       // Figma 190:1435 (exact)
  { name: 'Royal Blue', hex: '#4169E1' },    // placeholder until API
  { name: 'Premium Black', hex: '#1A1A1A' }, // placeholder until API
  { name: 'Pakistan Green', hex: '#0A6B3B' },// placeholder until API
  { name: 'Rani Rose', hex: '#E75480' },     // placeholder until API
  { name: 'Mustard', hex: '#D99100' },       // placeholder until API
  { name: 'Premium White', hex: '#F5F5F5' }, // placeholder until API
  { name: 'Stone', hex: '#C9B79C' },         // placeholder until API
  { name: 'Baby Pink', hex: '#F4C2C2' },     // placeholder until API
];

// The Figma color selector lays out 12 circles (2 rows × 6). With 12 colours
// above, all slots are filled; if a product supplies fewer via the API, the
// remaining slots render as empty outlined placeholders.
export const SWATCH_SLOTS = 12;

// Pool of bundled product photos, used to fabricate a 3-image gallery per
// product until the API returns real per-product images.
const IMAGE_POOL = [
  'imgMobAl1Royalblue', 'imgMobAl1White', 'imgMobAl1Black', 'imgMobAl1Mustard', 'imgMobAl1Pakgreen',
  'imgNwarPhoto1', 'imgNwarPhoto2', 'imgNwarPhoto3', 'imgNwarPhoto4', 'imgNwarPhoto5', 'imgPdpGoldenYellow',
];

// ---------------------------------------------------------------------------
// PDP routing
// ---------------------------------------------------------------------------

// Landing on /product with no id (old links, bookmarks) opens this product.
export const DEFAULT_PRODUCT_SLUG = 'golden-yellow-ankle-leggings';

/**
 * Canonical, shareable PDP path for a product.
 *
 * Every product object the API returns carries `id` = the DB's `Product.slug`
 * (unique + indexed, and auto-generated with a -2/-3 suffix on collision when a
 * product is uploaded), so this needs no per-product mapping: any product that
 * exists in the database — including ones added in the future — gets its own
 * URL for free. Accepts a product/card/wishlist item or a bare slug.
 */
export function productPath(product) {
  const id = typeof product === 'string' ? product : (product?.id || product?.slug);
  return `/product/${encodeURIComponent(id || DEFAULT_PRODUCT_SLUG)}`;
}

export function sizesFor(product) {
  return product?.sizes?.length ? product.sizes : SIZES;
}

export function colorsFor(product) {
  return product?.colors?.length ? product.colors : SWATCHES;
}

// Exactly 3 images per product (the product's main photo first, then 2 more
// from the pool). Returns asset keys to be resolved with asset().
export function imagesFor(product) {
  if (product?.images?.length) return product.images.slice(0, 3);
  const main = product?.img || 'imgPdpGoldenYellow';
  const out = [main];
  for (let k = 0; out.length < 3 && k < IMAGE_POOL.length; k++) {
    const cand = IMAGE_POOL[k];
    if (!out.includes(cand)) out.push(cand);
  }
  return out;
}

// Default selected colour index = the product's own colour if it's one of the
// 12 swatches, otherwise the first swatch.
export function defaultColorIndex(product) {
  const list = colorsFor(product);
  const i = list.findIndex((c) => c.name?.toLowerCase() === (product?.color || '').toLowerCase());
  return i >= 0 ? i : 0;
}
