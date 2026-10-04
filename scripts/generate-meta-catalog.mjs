/**
 * Regenerate the Meta Pixel product mapping from the live catalogue.
 *
 *   npm run pixel:catalog                 # uses VITE_API_URL / the prod API
 *   API=http://localhost:5000/api/v1 npm run pixel:catalog
 *
 * Writes:
 *   src/data/products.js                       master list used by the app
 *   meta/blutone-meta-content-ids.xlsx         sheet for Meta Commerce Manager
 *   meta/blutone-meta-content-ids.csv          same, as CSV
 *   meta/blutone-meta-catalog-feed.csv         Meta catalog product feed
 *
 * The Content ID is derived from each product's slug (see src/lib/sku.js), so
 * this script never invents an ID — it only snapshots what the app computes at
 * runtime. Re-run it whenever products are added or renamed.
 */

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { skuFromSlug } from '../src/lib/sku.js';
import { buildXlsx, buildCsv } from './xlsx.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = process.env.SITE_URL || 'https://blutone.in';

function apiBase() {
  if (process.env.API) return process.env.API.replace(/\/$/, '');
  try {
    const env = readFileSync(resolve(ROOT, '.env'), 'utf8');
    const line = env.split(/\r?\n/).find((l) => /^\s*VITE_API_URL\s*=/.test(l));
    if (line) return line.split('=').slice(1).join('=').trim().replace(/\/$/, '');
  } catch { /* fall through to the default */ }
  return 'https://blutone-backend.vercel.app/api/v1';
}

const PROD_API = 'https://blutone-backend.vercel.app/api/v1';
let BASE = apiBase();

async function load(base) {
  const res = await fetch(`${base}/products?limit=1000`);
  if (!res.ok) throw new Error(`GET ${base}/products failed (${res.status})`);
  const json = await res.json();
  if (!json?.success) throw new Error(json?.error?.message || 'API returned success:false');
  return json.data || [];
}

// The configured base is usually a local dev server; fall back to production so
// the sheet can be regenerated without booting the backend first.
async function fetchList() {
  try {
    return await load(BASE);
  } catch (err) {
    if (BASE === PROD_API) throw err;
    console.warn(`${BASE} unreachable (${err.message}) - falling back to ${PROD_API}`);
    BASE = PROD_API;
    return load(BASE);
  }
}

async function fetchOne(slug) {
  try {
    const res = await fetch(`${BASE}/products/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? json.data : null;
  } catch {
    return null;
  }
}

/** Slugs in the previous snapshot, so nothing silently drops out of the sheet. */
async function previousSlugs() {
  try {
    const mod = await import(
      `${pathToFileURL(resolve(ROOT, 'src/data/products.js')).href}?t=${Date.now()}`
    );
    return (mod.PRODUCTS || []).map((p) => p.slug);
  } catch {
    return [];
  }
}

/**
 * The listing endpoint deliberately hides some products (bundles are reachable
 * only by direct link), but they still have a PDP and so still need a Content
 * ID. Anything in the previous snapshot that the listing no longer returns is
 * re-checked by slug: still resolving means "hidden", a 404 means "deleted".
 */
async function fetchProducts() {
  const list = await fetchList();
  const listed = new Set(list.map((p) => p.id));
  const extras = [
    ...(await previousSlugs()),
    ...String(process.env.EXTRA_SLUGS || '').split(',').map((s) => s.trim()),
  ].filter((slug) => slug && !listed.has(slug));

  const hidden = [];
  for (const slug of [...new Set(extras)]) {
    const p = await fetchOne(slug);
    if (p) hidden.push(p);
    else console.warn(`dropped (no longer in the catalogue): ${slug}`);
  }
  if (hidden.length) {
    console.log(`Unlisted but live  : ${hidden.map((p) => p.id).join(', ')}`);
  }
  return [...list, ...hidden];
}

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

function build(products) {
  const rows = products
    .map((p) => ({
      sku: skuFromSlug(p),
      slug: p.id,
      name: p.title || '',
      category: p.category || '',
      categoryLabel: p.categoryLabel || '',
      color: p.color || '',
      colorHex: p.colorHex || '',
      price: num(p.price),
      mrp: num(p.mrp),
      sizes: (p.sizes || []).join(' | '),
      image: p.img && /^https?:/.test(p.img) ? p.img : '',
      url: `${SITE}/product/${p.id}`,
    }))
    .sort((a, b) => a.sku.localeCompare(b.sku));

  const dupes = rows
    .map((r) => r.sku)
    .filter((s, i, arr) => arr.indexOf(s) !== i);
  if (dupes.length) {
    throw new Error(`Duplicate Content IDs generated: ${[...new Set(dupes)].join(', ')}`);
  }
  return rows;
}

/* ------------------------- src/data/products.js ------------------------- */

function writeMasterList(rows) {
  const entries = rows.map((r) =>
    `  { slug: ${JSON.stringify(r.slug)}, sku: ${JSON.stringify(r.sku)}, name: ${JSON.stringify(r.name)}, price: ${r.price}, category: ${JSON.stringify(r.category)} },`
  ).join('\n');

  const file = `// AUTO-GENERATED by \`npm run pixel:catalog\` — do not edit by hand.
// Snapshot of the live catalogue (${rows.length} products) taken from
// ${BASE}/products.
//
// This is the master product list the Meta Pixel spec calls for: one row per
// product mapping its URL slug to the Content ID (SKU) configured in Meta
// Commerce Manager. Nothing in the app hardcodes a per-product event — the PDP
// template looks the current slug up here and sends whatever SKU it finds.
//
// A product missing from this snapshot (added since it was generated) still
// tracks correctly: contentIdFor() falls back to skuFromSlug(), which produces
// the exact same ID from the slug. Regenerating just makes the sheet complete.

import { skuFromSlug } from '../lib/sku.js';

export const PRODUCTS = [
${entries}
];

/** slug -> product row, for O(1) lookup from the PDP. */
export const PRODUCT_BY_SLUG = Object.fromEntries(PRODUCTS.map((p) => [p.slug, p]));

/** slug -> Content ID (SKU). */
export const SKU_BY_SLUG = Object.fromEntries(PRODUCTS.map((p) => [p.slug, p.sku]));

const slugOf = (product) =>
  (typeof product === 'string' ? product : product?.id || product?.slug || '');

/**
 * The Content ID to send in \`content_ids\`. Accepts a PDP payload, a list card,
 * a cart line or a bare slug. Falls back to deriving the ID from the slug so a
 * newly added product is never tracked without one.
 */
export function contentIdFor(product) {
  const slug = slugOf(product);
  if (!slug) return '';
  return SKU_BY_SLUG[slug] || skuFromSlug(product);
}

/** The snapshot row for a product, when we have one (name / price / category). */
export function productMeta(product) {
  return PRODUCT_BY_SLUG[slugOf(product)] || null;
}
`;
  writeFileSync(resolve(ROOT, 'src/data/products.js'), file, 'utf8');
}

/* ------------------------------ Sheets --------------------------------- */

const MAPPING_HEADER = [
  'Content ID (SKU)', 'Product Name', 'Category', 'Colour', 'Price (INR)', 'MRP (INR)',
  'Sizes', 'Product URL', 'Slug',
];

const EVENT_ROWS = [
  ['Event', 'Fires when', 'Where in the app', 'Key parameters'],
  ['PageView', 'Every page load and every SPA route change', 'index.html snippet + RouteTracker in App.jsx', '-'],
  ['ViewContent', 'A product page opens (no reload needed)', 'ProductPage.jsx / desktop/DesktopProduct.jsx', 'content_ids, content_type=product, content_name, value, currency'],
  ['AddToCart', 'ADD TO BAG is clicked', 'ProductPage.jsx / desktop/DesktopProduct.jsx', 'content_ids, contents[{id,quantity}], value, currency'],
  ['AddToWishlist', 'The heart is turned on', 'wishlist.jsx', 'content_ids, content_type, value, currency'],
  ['Search', 'A search listing is opened (?q=)', 'ProductListPage.jsx / desktop/DesktopProductList.jsx', 'search_string, content_ids of the results'],
  ['ViewCategory', 'A category / group listing is opened', 'ProductListPage.jsx / desktop/DesktopProductList.jsx', 'content_name, content_ids of the results'],
  ['InitiateCheckout', 'CHECKOUT is clicked in the bag', 'BagPage.jsx / desktop/DesktopBag.jsx', 'content_ids, contents, num_items, value, currency'],
  ['AddPaymentInfo', 'PROCEED TO PAYMENT with a method chosen', 'CheckoutPage.jsx / desktop/DesktopCheckout.jsx', 'content_ids, value, currency, payment_method'],
  ['Purchase', 'An order is placed (COD or Razorpay)', 'checkout/ui.jsx + CodPage.jsx / desktop/DesktopCod.jsx', 'content_ids, contents, value, currency, order_id (also sent as eventID)'],
  ['CompleteRegistration', 'Phone-OTP login succeeds', 'auth.jsx', 'status (new / returning)'],
  ['Lead', 'The ORDER IN BULK form is submitted', 'components/BulkOrderForm.jsx', 'content_name'],
];

const README_ROWS = [
  ['Blutone - Meta Pixel content IDs'],
  [],
  ['Pixel ID', '1867577427953385'],
  ['Products', ''],
  ['Generated from', BASE],
  ['Generated at', new Date().toISOString()],
  [],
  ['How to use this workbook'],
  ['1', 'Open Commerce Manager > Catalogue > Items.'],
  ['2', 'For every item, put the "Content ID (SKU)" value from the "Content IDs" sheet into the item\'s Content ID field.'],
  ['3', 'The website already sends exactly these IDs in content_ids, so the match is 1:1 with no further code changes.'],
  ['4', 'Alternatively upload meta/blutone-meta-catalog-feed.csv as a data-feed source - it already carries the same ids.'],
  ['5', 'Verify with the Meta Pixel Helper extension on a product page, then in Events Manager > Test Events.'],
  [],
  ['Note', 'image_link is blank in the feed wherever the catalogue has no image URL yet - Meta requires it, so fill those before uploading.'],
];

function writeSheets(rows) {
  const dir = resolve(ROOT, 'meta');
  mkdirSync(dir, { recursive: true });

  const mapping = [
    MAPPING_HEADER,
    ...rows.map((r) => [
      r.sku, r.name, r.categoryLabel || r.category, r.color, r.price, r.mrp,
      r.sizes, r.url, r.slug,
    ]),
  ];

  // Meta catalogue data-feed columns (the required set + the useful optionals).
  const feed = [
    ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand', 'product_type', 'sale_price'],
    ...rows.map((r) => [
      r.sku,
      r.name,
      `${r.name} by Blutone. ${r.color ? r.color + ' colour. ' : ''}Sizes: ${r.sizes || 'Free Size'}.`,
      'in stock',
      'new',
      `${r.mrp || r.price} INR`,
      r.url,
      r.image,
      'Blutone',
      r.categoryLabel || r.category,
      r.price && r.mrp && r.price < r.mrp ? `${r.price} INR` : '',
    ]),
  ];

  const readme = README_ROWS.map((row) =>
    (row[0] === 'Products' ? ['Products', rows.length] : row)
  );

  writeFileSync(resolve(dir, 'blutone-meta-content-ids.xlsx'), buildXlsx([
    { name: 'Content IDs', rows: mapping },
    { name: 'Catalog Feed', rows: feed },
    { name: 'Pixel Events', rows: EVENT_ROWS },
    { name: 'Read Me', rows: readme },
  ]));
  writeFileSync(resolve(dir, 'blutone-meta-content-ids.csv'), buildCsv(mapping), 'utf8');
  writeFileSync(resolve(dir, 'blutone-meta-catalog-feed.csv'), buildCsv(feed), 'utf8');
}

/* -------------------------------- main --------------------------------- */

const products = await fetchProducts();
const rows = build(products);
writeMasterList(rows);
writeSheets(rows);

console.log(`Source        : ${BASE}`);
console.log(`Products      : ${rows.length}`);
console.log('Wrote         : src/data/products.js');
console.log('              : meta/blutone-meta-content-ids.xlsx');
console.log('              : meta/blutone-meta-content-ids.csv');
console.log('              : meta/blutone-meta-catalog-feed.csv');
console.log('\nFirst rows:');
rows.slice(0, 5).forEach((r) => console.log(`  ${r.sku.padEnd(32)} ${r.slug}`));
