import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Frame from './components/Frame.jsx';
import GridProductCard from './components/GridProductCard.jsx';
import SortFilterBar from './components/SortFilterBar.jsx';
import FilterModal from './components/FilterModal.jsx';
import SortModal from './components/SortModal.jsx';
import { GridCardSkeleton } from './components/Loaders.jsx';
import { C, F } from './tokens.js';
import { emptyFilters, applyFilters, sortProducts, countFilters, buildColorOptions, buildFacetCounts, slugsInGroup } from './catalog.js';
import { getAllProducts, getProducts, getProductsByCategory, searchProducts, getCategories, getFilters } from './api/client.js';
import { productPath } from './product.js';
import { useAsync } from './hooks/useApi.js';
import { trackSearch, trackViewCategory } from './lib/metaPixel.js';

const abs = (s) => ({ position: 'absolute', ...s });

const GRID_TOP = 110;
const CARD_W = 170;
const CARD_H = 350;
const ROW_PITCH = 390;
const COL_X = [20, 203];

function CaretLeft({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Back" style={{ position: 'absolute', left: 20, top: 64, width: 32, height: 32, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M20 8 L12 16 L20 24" stroke={C.slate} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export default function ProductListPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const cat = params.get('cat');
  const group = params.get('group'); // product type spanning categories (e.g. "leggings")
  const q = params.get('q');

  // Fetch the base set from the API; sorting + filtering stay client-side.
  const { data: base, loading: baseLoading } = useAsync(
    () => (group ? getProducts({ group }) : cat ? getProductsByCategory(cat) : q != null ? searchProducts(q) : getAllProducts()),
    [group, cat, q],
    []
  );
  const { data: cats } = useAsync(getCategories, [], []);

  // Per-scope filter facets (option counts) for the FILTERS modal. Scope mirrors
  // the base fetch above; search has no facet scope so it falls back to all.
  const { data: facets } = useAsync(
    () => getFilters(group ? { group } : cat ? { category: cat } : {}),
    [group, cat],
    null
  );
  const facetCounts = useMemo(() => buildFacetCounts(facets), [facets]);

  const title = group
    ? group.toUpperCase()
    : cat
    ? ((cats || []).find((c) => c.slug === cat)?.label || base?.[0]?.categoryLabel || 'Products').toUpperCase()
    : q != null ? `"${q}"` : 'ALL PRODUCTS';

  // Meta Pixel: a search listing is a Search event, a category/group listing a
  // ViewCategory. Both carry the Content IDs of what was actually shown, which
  // is what lets an audience be built from "people who browsed leggings".
  //
  // useAsync keeps the PREVIOUS scope's results on screen while the next request
  // is in flight, and `loading` only flips on the render after the scope
  // changes — so "not loading" alone would fire once with the old product list
  // and again with the new one. `loadedScope` waits until this scope's own load
  // has been observed; `trackedScope` then caps it at one event per scope.
  const scope = q != null ? `q:${q}` : cat ? `cat:${cat}` : group ? `group:${group}` : 'all';
  const loadedScope = useRef('');
  const trackedScope = useRef('');
  useEffect(() => {
    if (baseLoading) { loadedScope.current = scope; return; }
    if (loadedScope.current !== scope || trackedScope.current === scope) return;
    trackedScope.current = scope;
    if (q != null) trackSearch(q, base);
    else if (cat || group) trackViewCategory(title, base);
  }, [scope, baseLoading, base, title, q, cat, group]);


  const [filters, setFilters] = useState(emptyFilters());
  const [sort, setSort] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // re-derive whenever the base set, filters or sort change
  const products = useMemo(
    () => sortProducts(applyFilters(base || [], filters), sort),
    [base, filters, sort]
  );

  // Colour swatches for the filter come from the categories in scope (each
  // category carries its unique `colors` from the API). For a group (e.g.
  // "leggings") merge every matching category; for one category use just it;
  // otherwise offer every colour in the catalog. Names shared across categories
  // collapse to a single swatch (see buildColorOptions).
  const colorOptions = useMemo(() => {
    const all = cats || [];
    let scope = all;
    if (group) {
      const slugs = slugsInGroup(group);
      scope = all.filter((c) => slugs.includes(c.slug));
    } else if (cat) scope = all.filter((c) => c.slug === cat);
    return buildColorOptions(scope);
  }, [cats, group, cat]);

  // Show a skeleton grid on the first load (before any data arrives) so users
  // see the list "coming" instead of the empty "no products" message.
  const showSkeleton = baseLoading && (base || []).length === 0;
  const SKELETON_COUNT = 6;
  const rows = showSkeleton ? Math.ceil(SKELETON_COUNT / 2) : Math.max(1, Math.ceil(products.length / 2));
  const height = GRID_TOP + (rows - 1) * ROW_PITCH + CARD_H + 30;
  const nFilters = countFilters(filters);

  const toTop = () => window.scrollTo({ top: 0, behavior: 'auto' });

  return (
    <>
      <Frame height={height} cropTop={48}>
        <CaretLeft onClick={() => navigate(-1)} />
        <p style={abs({ left: 64, top: 68, width: 300, ...F.m500, fontSize: 20, color: C.slate, textTransform: 'uppercase' })}>{title}</p>

        {showSkeleton ? (
          Array.from({ length: SKELETON_COUNT }).map((_, i) => {
            const row = Math.floor(i / 2);
            const col = i % 2;
            return (
              <div key={'skel' + i} style={abs({ left: COL_X[col], top: GRID_TOP + row * ROW_PITCH, width: CARD_W, height: CARD_H })}>
                <GridCardSkeleton />
              </div>
            );
          })
        ) : products.length === 0 ? (
          <p style={abs({ left: 20, top: GRID_TOP + 20, width: 353, ...F.m400, fontSize: 16, color: C.gray })}>No products match these filters.</p>
        ) : (
          products.map((p, i) => {
            const row = Math.floor(i / 2);
            const col = i % 2;
            return (
              <div key={p.id} style={abs({ left: COL_X[col], top: GRID_TOP + row * ROW_PITCH, width: CARD_W, height: CARD_H })}>
                <GridProductCard product={p} onClick={() => navigate(productPath(p), { state: { product: p } })} />
              </div>
            );
          })
        )}
      </Frame>

      {/* Sticky toolbar + modals (viewport-level, above the bottom nav) */}
      <SortFilterBar onSort={() => setSortOpen(true)} onFilter={() => setFilterOpen(true)} filterCount={nFilters} />
      <FilterModal
        open={filterOpen}
        initial={filters}
        colorOptions={colorOptions}
        counts={facetCounts}
        onClose={() => setFilterOpen(false)}
        onApply={(f) => { setFilters(f); setFilterOpen(false); toTop(); }}
      />
      <SortModal
        open={sortOpen}
        value={sort}
        onClose={() => setSortOpen(false)}
        onApply={(s) => { setSort(s); setSortOpen(false); toTop(); }}
      />
    </>
  );
}
