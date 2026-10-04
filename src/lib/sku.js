// Deterministic SKU / Meta "Content ID" derivation.
//
// Every Pixel event we send must carry a `content_ids` value that matches the
// Content ID column in Meta Commerce Manager. Rather than hand-maintaining that
// mapping, the SKU is DERIVED from the product's slug — the one field that is
// already unique, stable and part of the URL (`/product/<slug>`).
//
// Consequence: a product added to the catalogue tomorrow gets a valid, stable
// Content ID with zero code changes. src/data/products.js is the pre-computed
// snapshot of this function over the live catalogue (regenerate it with
// `npm run pixel:catalog`) and doubles as the sheet handed to Commerce Manager.

export const BRAND_PREFIX = 'BLU';

// Category slug -> 3-letter code. An unknown category falls back to the first
// three letters of its slug, so a new category never breaks SKU generation.
export const CATEGORY_CODES = {
  'ankle-leggings': 'ANK',
  'chuddidar-leggings': 'CHU',
  'churidar-leggings': 'CHU',
  'palazzos-pant': 'PAL',
  'straight-pants': 'STR',
  'saree-shapewear': 'SHP',
  bundle: 'BND',
};

// Words that describe the category / brand / marketing rather than the product's
// identity within its category. Stripped from the slug so what remains is the
// distinguishing part (almost always the colour).
const STOP_WORDS = new Set([
  'blutone', 'blutones', 'womens', 'women', 'woman', 'for', 'the', 'and', 'with',
  'color', 'colors', 'colour', 'trending', 'pack', 'bundle',
  'ankle', 'leggings', 'legging', 'churidar', 'chuddidar', 'chudidar',
  'palazzo', 'palazzos', 'pant', 'pants', 'straight', 'straightcut', 'cut',
  'shapewear', 'saree', 'sarees', 's',
]);

/** Category code for a product's category slug. */
export function categoryCode(categorySlug) {
  const key = String(categorySlug || '').toLowerCase();
  if (CATEGORY_CODES[key]) return CATEGORY_CODES[key];
  const letters = key.replace(/[^a-z]/g, '');
  return (letters.slice(0, 3) || 'GEN').toUpperCase();
}

/**
 * The distinguishing part of a slug: its words minus the category/brand noise.
 * Falls back to the colour name (and then to the whole slug) when stripping
 * leaves nothing — e.g. "blutone-womens-straight-pant" is entirely stop-words.
 */
function identityWords(slug, colorName) {
  const words = String(slug || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const kept = words.filter((w) => !STOP_WORDS.has(w));
  if (kept.length) return kept;
  const fromColor = String(colorName || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (fromColor.length) return fromColor;
  return words.length ? words : ['item'];
}

/**
 * Build the Content ID for a product.
 * `BLU-<CATEGORY>-<IDENTITY>` — e.g. "BLU-ANK-BABY-PINK".
 *
 * Readable on purpose: whoever fills the Content ID field in Commerce Manager
 * can see at a glance which product a row is for.
 *
 * @param {object|string} product a product/card object, or a bare slug
 * @param {string} [categorySlug] required only when passing a bare slug
 */
export function skuFromSlug(product, categorySlug) {
  const isObj = product && typeof product === 'object';
  const slug = isObj ? (product.id || product.slug || '') : String(product || '');
  const cat = isObj ? (product.category || product.categorySlug || '') : (categorySlug || '');
  const color = isObj ? (typeof product.color === 'string' ? product.color : product.color?.name) : '';
  if (!slug) return '';
  const identity = identityWords(slug, color).join('-').toUpperCase();
  return `${BRAND_PREFIX}-${categoryCode(cat)}-${identity}`;
}
