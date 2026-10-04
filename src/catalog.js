// Client-side filter & sort helpers + the filter/sort UI config.
//
// Product, category and search DATA now comes from the backend API (see
// src/api/client.js). Sorting and filtering stay on the client by design — the
// API returns the full set for a scope and these helpers narrow/order it in
// memory, exactly as the FilterModal / SortModal UI expects.

/* ---------------- Colour options ---------------- */

// A colour's identity for filtering = its NAME + its exact HEX. This matters when
// the catalog contains near-collisions: two products may share a name but differ
// in shade (e.g. "Teel" #056437 vs "Teel" #0376B2), or share a hex but differ in
// name (e.g. "Teel" #056437 vs "Pakistan Green" #056437). Keying on name alone
// (or hex alone) would over-match and pull in the wrong product; the pair
// uniquely selects the intended one.
export function colorKey(name, hex) {
  return `${(name || '').trim().toLowerCase()}||${(hex || '').trim().toUpperCase()}`;
}

// The Colour filter swatches are driven by the backend (each category carries
// its unique `colors`, derived from its products → exact Figma hex). Given the
// categories relevant to the current view, build one deduplicated swatch list.
// Two entries collapse only when BOTH name and hex match, so every distinct
// colour value gets its own swatch and selecting it filters to exactly that
// colour's product(s).
export function buildColorOptions(categories = []) {
  const seen = new Set();
  const out = [];
  for (const cat of categories) {
    for (const c of cat?.colors || []) {
      if (!c?.name) continue;
      const id = colorKey(c.name, c.hex);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ id, name: c.name, hex: c.hex || '' });
    }
  }
  return out;
}

/* ---------------- Filtering & sorting ---------------- */

// Price buckets used by the Price filter tab.
const PRICE_RANGES = {
  'under-300': [0, 299],
  '300-400': [300, 400],
  '400-500': [401, 500],
  '500-plus': [501, Infinity],
};

/**
 * Home "SHOP BY CATEGORY" groups → the exact category slugs each contains.
 * MUST mirror CATEGORY_GROUPS in the backend constants, which resolves the same
 * `?group=` param server-side. Explicit on purpose: inferring membership from
 * the slug's last hyphen segment mis-grouped "palazzos-pant" (→ "pant") and let
 * a new category silently join or miss a group based on its name alone.
 */
export const CATEGORY_GROUPS = {
  leggings: ['ankle-leggings', 'chuddidar-leggings'],
  pants: ['straight-pants'],
  palazzos: ['palazzos-pant'],
  shapewear: ['saree-shapewear'],
};

/** Category slugs in a group, or [] for an unknown group. */
export function slugsInGroup(group) {
  return CATEGORY_GROUPS[String(group || '').toLowerCase()] || [];
}

// Filter tabs shown in the "Product multiple filter" modal (labels from Figma).
// Color + Price actually constrain the catalog; Size/Fabric/Length
// present representative options (the API can make them functional later).
// Color `options` are injected at render time from the API (buildColorOptions);
// the static entry here just declares the tab.
export const FILTER_TABS = [
  { key: 'color', label: 'Color', kind: 'color', options: [] },
  // Mirrors PRODUCT_SIZES in the backend constants — "S" (shapewear) and
  // "Free Size" (palazzos) must have chips or those products can't be filtered.
  { key: 'size', label: 'Size', kind: 'chip', options: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'Free Size'].map((s) => ({ id: s, label: s })) },
  { key: 'fabric', label: 'Fabric', kind: 'chip', options: ['Cotton', 'Viscose', 'Rayon', 'Polyster'].map((s) => ({ id: s, label: s })) },
  { key: 'price', label: 'Price', kind: 'chip', options: [
    { id: 'under-300', label: 'Under ₹300' },
    { id: '300-400', label: '₹300 - ₹400' },
    { id: '400-500', label: '₹400 - ₹500' },
    { id: '500-plus', label: '₹500 & above' },
  ] },
  { key: 'length', label: 'Length', kind: 'chip', options: ['Full Length', '3/4th Length'].map((s) => ({ id: s, label: s })) },
];

export function emptyFilters() {
  return { color: [], size: [], fabric: [], price: [], length: [] };
}

// Turn the /products/filters response into a lookup the FilterModal reads as
// `counts[tabKey][optionId]` → number. Only the dimensions the API returns with
// per-option counts (fabric, length) are included; size chips show no count.
export function buildFacetCounts(facets) {
  const map = {};
  for (const dim of ['fabric', 'length']) {
    const opts = facets?.[dim]?.options;
    if (!opts) continue;
    map[dim] = {};
    for (const o of opts) map[dim][o.label] = o.count;
  }
  return map;
}

export function countFilters(filters) {
  return Object.values(filters).reduce((n, arr) => n + arr.length, 0);
}

export function applyFilters(products, filters) {
  return products.filter((p) => {
    if (filters.color.length && !filters.color.includes(colorKey(p.color, p.colorHex))) return false;
    if (filters.price.length) {
      const price = Number(p.price);
      const ok = filters.price.some((id) => {
        const [lo, hi] = PRICE_RANGES[id] || [0, Infinity];
        return price >= lo && price <= hi;
      });
      if (!ok) return false;
    }
    // Size / fabric / length match the facet fields the API puts on each list
    // item (see backend toListItem). Within a dimension the selections are OR'd;
    // across dimensions they're AND'd. A product matches a size if it offers it.
    if (filters.size.length && !filters.size.some((s) => (p.sizes || []).includes(s))) return false;
    if (filters.fabric.length && !filters.fabric.includes(p.fabricFacet)) return false;
    if (filters.length.length && !filters.length.includes(p.lengthFacet)) return false;
    return true;
  });
}

export const SORT_OPTIONS = [
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
  { id: 'rating-desc', label: 'Customer Rating' },
];

export function sortProducts(products, sortId) {
  if (!sortId) return products;
  const arr = [...products];
  if (sortId === 'price-asc') arr.sort((a, b) => Number(a.price) - Number(b.price));
  else if (sortId === 'price-desc') arr.sort((a, b) => Number(b.price) - Number(a.price));
  else if (sortId === 'rating-desc') arr.sort((a, b) => Number(b.rating) - Number(a.rating));
  return arr;
}
