import './desktop.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import DesktopHeader from './DesktopHeader.jsx';
import DesktopFooter from './DesktopFooter.jsx';
import { RailCardSkeleton } from '../components/Loaders.jsx';
import { emptyFilters, applyFilters, buildColorOptions, buildFacetCounts, sortProducts, SORT_OPTIONS, FILTER_TABS, countFilters, slugsInGroup } from '../catalog.js';
import { getAllProducts, getProducts, getProductsByCategory, searchProducts, getCategories, getFilters } from '../api/client.js';
import { productPath } from '../product.js';
import { useAsync } from '../hooks/useApi.js';
import { trackSearch, trackViewCategory } from '../lib/metaPixel.js';

// Mirrors PRODUCT_SIZES in the backend constants: "S" is offered on shapewear
// and "Free Size" on palazzos, so both need a chip or those products can't be
// filtered by size.
const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'Free Size'];
const FABRICS = ['Cotton', 'Viscose', 'Rayon', 'Polyster'];
const LENGTHS = ['Full Length', '3/4th Length'];
// Price buckets — same ids/labels as the mobile Filters modal so applyFilters
// (which keys on these ids) yields identical result sets across breakpoints.
const PRICE_OPTIONS = FILTER_TABS.find((t) => t.key === 'price').options;

export default function DesktopProductList() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const cat = params.get('cat');
  const group = params.get('group');
  const q = params.get('q');

  const { data: base, loading: baseLoading } = useAsync(
    () => (group ? getProducts({ group }) : cat ? getProductsByCategory(cat) : q != null ? searchProducts(q) : getAllProducts()),
    [group, cat, q],
    []
  );
  const { data: cats } = useAsync(getCategories, [], []);
  const { data: facets } = useAsync(() => getFilters(group ? { group } : cat ? { category: cat } : {}), [group, cat], null);
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
  const [sort, setSort] = useState('');
  const fcount = countFilters(filters);

  const colorOptions = useMemo(() => {
    const all = cats || [];
    let scope = all;
    if (group) {
      const slugs = slugsInGroup(group);
      scope = all.filter((c) => slugs.includes(c.slug));
    } else if (cat) scope = all.filter((c) => c.slug === cat);
    return buildColorOptions(scope);
  }, [cats, group, cat]);

  const toggle = (key, id) => setFilters((d) => {
    const arr = d[key];
    return { ...d, [key]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id] };
  });
  const isOn = (key, id) => filters[key].includes(id);

  const products = useMemo(
    () => sortProducts(applyFilters(base || [], filters), sort),
    [base, filters, sort]
  );

  const check = (key, id, count, display) => (
    <label className="dl2-check" key={id}>
      <input type="checkbox" checked={isOn(key, id)} onChange={() => toggle(key, id)} />
      <span>{display || id}</span>
      {count != null && <span className="cnt">({count})</span>}
    </label>
  );

  return (
    <div className="dt">
      <DesktopHeader />
      <div className="dl2">
        <div className="dl2-crumb">
          <span onClick={() => navigate('/')}>Home</span> | <span onClick={() => navigate('/list')}>WOMEN</span> | <span className="on">{title}</span>
        </div>
        <div className="dl2-body">
          <aside className="dl2-side">
            <div className="dl2-fhead-row">
              <h3 className="dl2-fhead">FILTERS{fcount > 0 ? ` (${fcount})` : ''}</h3>
              {fcount > 0 && <button className="dl2-clear" onClick={() => setFilters(emptyFilters())}>Clear all</button>}
            </div>
            <div className="dl2-group">
              <h4>COLORS</h4>
              <div className="dl2-colors">
                {colorOptions.length === 0 && <span className="cnt">—</span>}
                {colorOptions.map((o) => (
                  <button key={o.id} title={o.name} className={'dl2-color' + (isOn('color', o.id) ? ' on' : '')} style={{ background: o.hex }} onClick={() => toggle('color', o.id)} />
                ))}
              </div>
            </div>
            <div className="dl2-group">
              <h4>SIZE</h4>
              <div className="dl2-sizes">
                {SIZES.map((s) => (
                  <button key={s} className={'dl2-size' + (isOn('size', s) ? ' on' : '')} onClick={() => toggle('size', s)}>{s}</button>
                ))}
              </div>
            </div>
            <div className="dl2-group">
              <h4>FABRIC</h4>
              {FABRICS.map((f) => check('fabric', f, facetCounts.fabric?.[f]))}
            </div>
            <div className="dl2-group">
              <h4>PRICE</h4>
              {PRICE_OPTIONS.map((o) => check('price', o.id, undefined, o.label))}
            </div>
            <div className="dl2-group">
              <h4>LENGTH</h4>
              {LENGTHS.map((l) => check('length', l, facetCounts.length?.[l]))}
            </div>
          </aside>

          <div className="dl2-main">
            <div className="dl2-toolbar">
              <span className="dl2-count">{products.length} product{products.length === 1 ? '' : 's'}</span>
              <div className="dl2-sort">
                <label htmlFor="dl2-sortsel">Sort by</label>
                <select id="dl2-sortsel" value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="">Recommended</option>
                  {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            </div>
            {baseLoading && (base || []).length === 0 ? (
              <div className="dl2-grid">
                {Array.from({ length: 6 }).map((_, i) => <RailCardSkeleton key={'skel' + i} variant="bs" />)}
              </div>
            ) : products.length === 0 ? (
              <p className="dl2-empty">No products match these filters.</p>
            ) : (
              <div className="dl2-grid">
                {products.map((p) => (
                  <ProductCard key={p.id} variant="bs" product={p} onClick={() => navigate(productPath(p), { state: { product: p } })} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <DesktopFooter />
    </div>
  );
}
