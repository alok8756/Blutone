import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import Frame from './components/Frame.jsx';
import Icon from './components/Icon.jsx';
import ProductCard from './components/ProductCard.jsx';
import { RailCardSkeleton } from './components/Loaders.jsx';
import ColorSelector from './components/ColorSelector.jsx';
import { passet } from './pdp/passet.js';
import { asset } from './assets.js';
import { F, C } from './tokens.js';
import { PRODUCT_DETAILS, SPEC_ROWS, WASH, REVIEW_TEXT, WashGlyph } from './pdp/pdpContent.jsx';
import { sizesFor, colorsFor, imagesFor, defaultColorIndex, productPath, DEFAULT_PRODUCT_SLUG } from './product.js';
import { getProduct, getProducts, getHome, prefetchProduct } from './api/client.js';
import { trackViewContent, trackAddToCart } from './lib/metaPixel.js';
import { productMeta } from './data/products.js';
import { useAsync } from './hooks/useApi.js';
import useSyncedImages from './hooks/useSyncedImages.js';
import { useCart } from './cart.jsx';
import { useAuth } from './auth.jsx';
import { useWishlist } from './wishlist.jsx';
import LoginModal from './components/LoginModal.jsx';
import MaskIcon from './components/MaskIcon.jsx';
import ContactUs from './components/ContactUs.jsx';
import { Spinner } from './components/Loaders.jsx';

const abs = (s) => ({ position: 'absolute', ...s });
const PI = (name, size, inset, inner, style) => (
  <Icon src={passet(name)} size={size} inset={inset} inner={inner} style={style} />
);

// Exact Figma colors used on the Product page
const DARK = '#212121';   // headings / values (Figma text-[#212121])
const BODY = '#565656';   // body copy + struck price
const SPEC = '#a4a4a4';   // spec labels
const BADGE = '#3e4558';  // "Verified" badge bg
const GRAY565 = '#565656';

const starInset = ['10.41%', '6.62%', '10.25%', '6.62%'];
const fullStar = (size) => PI('imgIcon11', size, starInset);
const halfStar = (size) => PI('imgIcon7', size, ['8.52%', '47.92%', '12.33%', '8.33%']);
const caretInset = ['30.21%', '40.63%', '30.21%', '36.46%'];

// "ADD TO BAG" button sits below the size selector; the Similar Products section
// and the flowing lower section are shifted down to make room for it.
// The "<category>: <colour>" subtitle is one line running from the left margin
// (20) to the wishlist button (325) — 297px of room at the Figma 19px. Longer
// category names ("Chuddidar Leggings") are shrunk to fit rather than sliding
// under the heart icon.
const SUB_FONT = 19;
const SUB_MAX_W = 297;

const SIMILAR_TOP = 1392;
const CAROUSEL_TOP = 1450;
const LOWER_TOP = 1937;

/* ---------------- Size buttons (selectable) ---------------- */

// Short labels (M … 4XL) keep the Figma 40px circle. A word-length label —
// "Free Size" on palazzos — gets desktop's treatment: a wider circle with the
// label wrapped onto two lines, instead of text spilling out of the 40px one.
function SizeBtn({ label, selected, onClick }) {
  const wide = String(label).length > 3;
  return (
    <button
      onClick={onClick}
      style={{
        width: wide ? 56 : 40,
        height: wide ? 56 : 40,
        borderRadius: '50%',
        padding: 0,
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        background: selected ? '#000' : '#d9d9d9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...F.m500,
        fontSize: wide ? 14 : 20,
        lineHeight: wide ? '17px' : 'normal',
        textAlign: 'center',
        color: selected ? '#fff' : '#000',
      }}
    >
      {label}
    </button>
  );
}

/* Swipeable 3-image gallery (drag / swipe left-right). `images` are resolved
   URLs, already preloaded as a set by useSyncedImages. */
function ImageCarousel({ images, alt, idx, setIdx }) {
  const W = 353;
  const [drag, setDrag] = useState(0);
  const startX = useRef(null);
  const onDown = (e) => { startX.current = e.clientX; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => { if (startX.current != null) setDrag(e.clientX - startX.current); };
  const onUp = () => {
    if (startX.current == null) return;
    const dx = drag;
    startX.current = null;
    setDrag(0);
    const n = images.length;
    if (n < 2) return;
    // Circular: swiping past the last image wraps to the first, and vice versa.
    if (dx <= -40) setIdx((idx + 1) % n);
    else if (dx >= 40) setIdx((idx - 1 + n) % n);
  };
  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={abs({ left: 20, top: 158, width: W, height: 468, borderRadius: 10, overflow: 'hidden', touchAction: 'pan-y', cursor: 'grab' })}
    >
      <div style={{ display: 'flex', width: W * images.length, height: '100%', transform: `translateX(${-idx * W + drag}px)`, transition: startX.current != null ? 'none' : 'transform 0.3s ease' }}>
        {images.map((im, i) => (
          <img key={i} src={im} alt={alt} draggable={false} style={{ width: W, height: '100%', objectFit: 'cover', flexShrink: 0, pointerEvents: 'none', display: 'block', maxWidth: 'none' }} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Accordion primitives ---------------- */

function Caret({ open }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none' }}>
      <div style={{ position: 'relative', width: 20, height: 10 }}>
        <div style={{ position: 'absolute', top: '-10.61%', right: '-5.3%', bottom: '-21.21%', left: '-5.3%' }}>
          <img src={passet('imgVector1')} alt="" style={{ display: 'block', width: '100%', height: '100%', maxWidth: 'none' }} />
        </div>
      </div>
    </div>
  );
}

function Accordion({ title, isOpen, onToggle, gap, headerRight, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, width: '100%' }}>
      <button onClick={onToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <p style={{ ...F.m600, fontSize: 19, color: DARK, whiteSpace: 'nowrap' }}>{title}</p>
          {headerRight}
        </div>
        <Caret open={isOpen} />
      </button>
      {isOpen && children}
    </div>
  );
}

// Figma "Line 8/9/10" between the accordions (node 190:1467, stroke #6E6E6E).
// Rendered as a solid 1px block (not a 0.5px stretched SVG) so it survives the
// Frame's scale() transform on narrow viewports and can't sub-pixel away.
function Divider() {
  return <div style={{ width: '100%', height: 1, flexShrink: 0, background: '#6e6e6e' }} />;
}

/* ---------------- Accordion contents (exact Figma) ---------------- */

// Specifications (597:6464)
function SpecCell({ heading, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start', width: 148 }}>
      <p style={{ ...F.m600, fontSize: 16, color: SPEC, width: '100%' }}>{heading}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start', width: '100%' }}>
        <p style={{ ...F.m500, fontSize: 16, color: DARK, width: '100%' }}>{value}</p>
        <div style={{ width: '100%', height: 0, borderTop: '1px solid #d9d9d9' }} />
      </div>
    </div>
  );
}

function SpecContent({ rows }) {
  const data = rows && rows.length ? rows : SPEC_ROWS;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      {data.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
          <SpecCell heading={r[0]} value={r[1]} />
          <SpecCell heading={r[2]} value={r[3]} />
        </div>
      ))}
    </div>
  );
}

// Fold the API's flat [{label,value}] spec list into the two-column row layout
// the spec table renders ([h1, v1, h2, v2]).
function specsToRows(specs) {
  if (!specs || !specs.length) return null;
  const rows = [];
  for (let i = 0; i < specs.length; i += 2) {
    const a = specs[i];
    const b = specs[i + 1];
    rows.push([a?.label || '', a?.value || '', b?.label || '', b?.value || '']);
  }
  return rows;
}

function WashItem({ item }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', width: item.w }}>
      <WashGlyph item={item} />
      <p style={{ ...F.m400, fontSize: 17, color: DARK, textAlign: 'center', width: '100%', lineHeight: 'normal' }}>{item.label}</p>
    </div>
  );
}

function WashingContent() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
        {WASH.slice(0, 3).map((it, i) => <WashItem key={i} item={it} />)}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
        {WASH.slice(3, 6).map((it, i) => <WashItem key={i} item={it} />)}
      </div>
    </div>
  );
}

// Reviews (597:6515)
function ReviewsContent() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start', width: '100%', padding: 10, boxSizing: 'border-box' }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start', width: '100%' }}>
          <p style={{ ...F.m500, fontSize: 19, color: DARK, width: '100%' }}>{REVIEW_TEXT}</p>
          <div style={{ display: 'flex', gap: 25, alignItems: 'flex-end' }}>
            <p style={{ ...F.m500, fontSize: 19, color: DARK, whiteSpace: 'nowrap' }}>Sneha Sharma</p>
            <div style={{ background: BADGE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px', borderRadius: 6 }}>
              <p style={{ ...F.m500, fontSize: 15, color: '#fff', whiteSpace: 'nowrap' }}>Verified</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Feature strip + footer pieces ---------------- */

function FeatureItem({ icon, l1, l2 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
      {icon}
      <div style={{ ...F.m500, fontSize: 15, color: '#000', textAlign: 'center', whiteSpace: 'nowrap' }}>
        <p style={{ lineHeight: 'normal' }}>{l1}</p>
        <p style={{ lineHeight: 'normal' }}>{l2}</p>
      </div>
    </div>
  );
}

function Social({ name, inset, href, label }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(71,85,139,0.1)', display: 'flex', padding: 8, flexShrink: 0, boxSizing: 'border-box', cursor: 'pointer' }}>
      {PI(name, 24, inset)}
    </a>
  );
}

// Black SHOP footer — full-bleed 393 block (flows in the lower section).
function ShopFooter({ shopRows }) {
  const rows = shopRows && shopRows.length ? shopRows : [[], [], [], []];
  const link = (t) => <p style={{ ...F.m500, fontSize: 14, color: '#fff', whiteSpace: 'nowrap' }}>{t || ''}</p>;
  const d = <span style={{ width: 0, height: 12, borderLeft: '1px solid #fff' }} />;
  return (
    <div style={{ position: 'relative', width: 393, height: 186, background: '#000', overflow: 'hidden' }}>
      <p style={abs({ left: 20, top: 20, ...F.m500, fontSize: 20, color: '#fff' })}>SHOP</p>
      <div style={abs({ left: 0, top: 56, width: 393, display: 'flex', flexDirection: 'column', gap: 12 })}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', width: '100%' }}>
          {link(rows[0][0])}{d}{link(rows[0][1])}{d}{link(rows[0][2])}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px', width: 327 }}>
          <div style={{ display: 'flex', gap: 13, alignItems: 'center' }}>{link(rows[1][0])}{d}{link(rows[1][1])}{d}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', width: '100%' }}>
          {link(rows[2][0])}{d}{link(rows[2][1])}{d}{link(rows[2][2])}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', width: '100%' }}>
          <div style={{ display: 'flex', gap: 13, alignItems: 'center' }}>{link(rows[3][0])}{d}{link(rows[3][1])}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Quantity + Add-to-Bag bar (Figma 190:1732) ---------------- */
const MinusIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="#000" strokeWidth="2.6" strokeLinecap="round" /></svg>
);
const PlusIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#000" strokeWidth="2.6" strokeLinecap="round" /></svg>
);
const BagIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8h12l-1 12.5H7L6 8z" /><path d="M9 8.5V6.5a3 3 0 0 1 6 0v2" /></svg>
);

// Left half: quantity stepper (#d9d9d9). Right half: dark action button whose
// label flips to "GO TO BAG" once the product is in the bag (then it opens /bag).
function BagBar({ qty, onMinus, onPlus, inBag, onPrimary }) {
  return (
    <div style={{ width: 393, height: 72, display: 'flex' }}>
      <div style={{ width: 196, height: 72, background: '#d9d9d9', borderTop: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', boxSizing: 'border-box' }}>
        <button onClick={onMinus} aria-label="Decrease quantity" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}><MinusIcon /></button>
        <span style={{ ...F.m500, fontSize: 19, color: '#000' }}>{qty}</span>
        <button onClick={onPlus} aria-label="Increase quantity" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}><PlusIcon /></button>
      </div>
      <button onClick={onPrimary} style={{ flex: 1, height: 72, background: '#303136', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <BagIcon />
        <span style={{ ...F.m500, fontSize: 19, color: '#fff', whiteSpace: 'nowrap' }}>{inBag ? 'GO TO BAG' : 'ADD TO BAG'}</span>
      </button>
    </div>
  );
}

// Default product shown when navigated to /product directly (matches Figma 190:1399).
const DEFAULT = { title: 'Golden Yellow Ankle Leggings', color: 'Golden Yellow', price: '350', mrp: '499', rating: '4.5', count: '(34)' };

export default function ProductPage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  // The URL owns which product this is (/product/:slug), so the page is
  // shareable and survives a reload — nothing depends on router state.
  const { slug: slugParam } = useParams();
  const slug = slugParam || DEFAULT_PRODUCT_SLUG;
  const { data: detail, loading: detailLoading, error: detailError } = useAsync(() => getProduct(slug), [slug], null);
  const { data: similar, loading: similarLoading } = useAsync(() => getProducts({ tag: 'Best Selling' }), [], []);
  const { data: home } = useAsync(getHome, [], {});
  const bestSellers = similar || [];
  const shopRows = home?.shopRows || [];

  // The card we navigated from paints the header instantly while the detail
  // request is in flight — but only when it's really this product's card
  // (a shared link arrives with no state at all).
  const hint = state?.product?.id === slug ? state.product : null;
  // `detail` still holds the PREVIOUS product while the next request is in
  // flight, so a matching hint outranks it: fresh detail > this card > stale.
  const fresh = detail?.id === slug ? detail : null;
  const p = fresh || hint || detail || DEFAULT;
  // A link to a product that no longer exists must say so rather than silently
  // rendering DEFAULT (someone else's product).
  const notFound = !!detailError && !hint;
  const firstLoad = detailLoading && !detail && !hint;
  const title = p.title || DEFAULT.title;
  const color = p.color || DEFAULT.color;
  const price = p.price || DEFAULT.price;
  const mrp = p.mrp || DEFAULT.mrp;
  const rating = p.rating || DEFAULT.rating;
  const count = p.count || DEFAULT.count;
  // Options come straight from the product-details API (these helpers prefer
  // product.sizes / product.colors / product.images when present).
  const colors = colorsFor(p);
  const sizes = sizesFor(p);
  // Gallery source: prefer the swatch/list item we navigated with (it carries
  // this colour's own gallery) over a `detail` that's still the previous
  // product. Then useSyncedImages holds the old photos until the whole incoming
  // set has loaded, so every slide swaps in one render instead of one by one.
  const gallerySrc = fresh || (hint?.images?.length ? hint : p);
  const { images } = useSyncedImages(imagesFor(gallerySrc).map((im) => asset(im)));
  // Spec/description come only from the full detail, and only once it's this
  // product's — a stale payload would describe the previous product.
  const specRows = specsToRows(fresh?.specs);
  const detailsText = fresh?.description || PRODUCT_DETAILS;
  const pid = p.id || slug;

  // Meta Pixel ViewContent. The master list (src/data/products.js) already knows
  // this slug's Content ID, name and price, so the event fires the moment the
  // route changes instead of waiting on the detail request. Keyed on `slug`
  // alone: one view per product, no matter how many times the data re-resolves.
  const pixelProduct = fresh || hint || productMeta(slug);
  useEffect(() => {
    if (pixelProduct) trackViewContent(pixelProduct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
  // Subtitle prefix ("<category>: <colour>"), same source as desktop: the
  // product's real category, so palazzos / pants / shapewear stop reading
  // "Leggings: Bottle Green". Bundles have no browsable category.
  const catSlug = p.category && p.category !== 'bundle' ? p.category : null;
  const catTitle = p.categoryLabel || (catSlug ? catSlug.replace(/-/g, ' ') : 'Leggings');

  // Bundles (e.g. the Black + White pack) have no colour choice: the "Select
  // Colors" card is hidden and the rest of the absolutely-positioned page is
  // pulled up by the vertical space that card occupied (208px).
  const bundle = p.productType === 'bundle';
  const OFF = bundle ? 208 : 0;
  const featureTop = 1008 - OFF;
  const sizeTop = 1120 - OFF;
  const barTop = 1264 - OFF;
  const similarTop = SIMILAR_TOP - OFF;
  const carouselTop = CAROUSEL_TOP - OFF;
  const lowerTop = LOWER_TOP - OFF;

  const [open, setOpen] = useState({ details: false, specs: false, washing: false, reviews: false });
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const [imgIdx, setImgIdx] = useState(0);
  const [subFont, setSubFont] = useState(SUB_FONT);
  const [selColor, setSelColor] = useState(() => defaultColorIndex(p));
  const [selSize, setSelSize] = useState(0);
  const [colorPage, setColorPage] = useState(0); // "Select Colors" pager (12 per page)
  const [qty, setQty] = useState(1);
  // The sticky bag bar floats above the bottom nav until its inline "home" (just
  // after the size chart) scrolls into view, then it docks there. `floating`
  // toggles which of the two renders is shown; `vp` scales the fixed one to the
  // frame width (the Frame's transform breaks position:fixed, so it lives at
  // viewport level like the bottom nav).
  const [floating, setFloating] = useState(true);
  const [vp, setVp] = useState({ scale: 1, navH: 74, frameW: 393 });
  const barRef = useRef(null);

  // Measure the subtitle at the design size and, if it overruns its 297px lane,
  // scale the font down by exactly the overflow ratio (text width is linear in
  // font size, so one pass fits it). Runs before paint, so no visible reflow.
  const subtitle = `${catTitle}: ${bundle ? color : (colors[selColor]?.name || color)}`;
  const subRef = useRef(null);
  useLayoutEffect(() => {
    const el = subRef.current;
    if (!el) return;
    el.style.fontSize = `${SUB_FONT}px`;
    const w = el.scrollWidth;
    setSubFont(w > SUB_MAX_W ? Math.max(14, Math.floor((SUB_FONT * SUB_MAX_W) / w)) : SUB_FONT);
  }, [subtitle]);

  const { isAuthenticated } = useAuth();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const [loginOpen, setLoginOpen] = useState(false);
  const wished = isWishlisted(slug);
  const handleHeart = () => {
    if (!isAuthenticated) setLoginOpen(true);
    else toggleWishlist(slug, sizes[selSize]);
  };

  const { addItem, items } = useCart();
  // "In bag" = this product already added (any variant). Once added, the button
  // becomes GO TO BAG and opens the cart instead of adding again.
  const inBag = (items || []).some((x) => x.id === pid);
  const addToBag = () => {
    trackAddToCart({ ...p, id: pid }, { qty, price });
    addItem({
      id: pid,
      category: p.category,
      title,
      img: p.img || 'imgPdpGoldenYellow',
      color: bundle ? color : colors[selColor]?.name,
      size: sizes[selSize],
      price,
      mrp,
      qty,
      shippingCharge: p.shippingCharge, // per-category charge from the DB (mirrors backend)
    });
  };
  const onPrimary = () => (inBag ? navigate('/bag') : addToBag());

  // Reset selections + scroll up when navigating to a different product.
  useEffect(() => {
    setImgIdx(0);
    setSelColor(defaultColorIndex(p));
    setColorPage(Math.floor(defaultColorIndex(p) / 12)); // show the page with the selected colour
    setSelSize(0);
    setQty(1);
    setOpen({ details: false, specs: false, washing: false, reviews: false });
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, detail]);

  // Track the frame scale / nav height so the floating bar matches the frame.
  useEffect(() => {
    const compute = () => {
      const w = Math.min(window.innerWidth, 500);
      const scale = w / 393;
      setVp({ scale, navH: 74 * scale, frameW: w });
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // Float the bar while its inline home is still below the docking line
  // (viewport bottom − nav − bar height); dock it once scrolled into view.
  useEffect(() => {
    const onScroll = () => {
      const el = barRef.current;
      if (!el) return;
      const dockLine = window.innerHeight - vp.navH - 72 * vp.scale;
      setFloating(el.getBoundingClientRect().top > dockLine + 1);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [vp]);

  // The lower section flows (so expanding an accordion reflows the page); we
  // measure its real height and grow the scaled canvas to fit.
  const lowerRef = useRef(null);
  const [frameH, setFrameH] = useState(2969);
  useLayoutEffect(() => {
    const el = lowerRef.current;
    if (!el) return;
    const measure = () => setFrameH(lowerTop + el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [lowerTop]);

  // Opened from a shared link: nothing is known about the product until the
  // fetch lands, so wait rather than painting DEFAULT's photo/title/price.
  if (firstLoad || notFound) {
    return (
      <Frame height={700} cropTop={64}>
        <div style={{ position: 'absolute', inset: 0, background: '#fff' }} />
        <button onClick={() => navigate('/')} aria-label="Home" style={abs({ left: 20, top: 80, width: 32, height: 32, border: 'none', background: 'none', padding: 0, cursor: 'pointer' })}>
          {PI('imgIcon6', 32, caretInset)}
        </button>
        {notFound ? (
          <div style={abs({ left: 20, top: 240, width: 353, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' })}>
            <p style={{ ...F.m600, fontSize: 20, color: C.slate, textAlign: 'center' }}>Product not available</p>
            <p style={{ ...F.m400, fontSize: 17, color: BODY, textAlign: 'center' }}>{detailError.message}</p>
            <button onClick={() => navigate('/list')} style={{ marginTop: 10, background: '#303136', border: 'none', borderRadius: 8, padding: '14px 28px', cursor: 'pointer', ...F.m500, fontSize: 17, color: '#fff' }}>
              BROWSE PRODUCTS
            </button>
          </div>
        ) : (
          <Spinner size={40} label="Loading product…" style={abs({ left: 20, top: 260, width: 353 })} />
        )}
      </Frame>
    );
  }

  return (
    <>
    <Frame height={frameH} cropTop={64}>
      <div style={{ position: 'absolute', inset: 0, background: '#fff' }} />

      {/* Header: back + title */}
      <button onClick={() => navigate(-1)} style={abs({ left: 20, top: 80, width: 32, height: 32, border: 'none', background: 'none', padding: 0, cursor: 'pointer' })}>
        {PI('imgIcon6', 32, caretInset)}
      </button>
      <p style={abs({ left: 64, top: 80, width: 309, ...F.m600, fontSize: 20, color: C.slate })}>{title}</p>

      {/* Product image gallery (swipeable) + dots */}
      <ImageCarousel images={images} alt={title} idx={imgIdx} setIdx={setImgIdx} />
      <div style={abs({ left: 0, top: 598, width: 393, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center' })}>
        {images.map((_, i) => (
          <div
            key={i}
            onClick={() => setImgIdx(i)}
            style={{ width: 41, height: 6, borderRadius: 4, background: i === imgIdx ? C.slate : '#d9d9d9', opacity: i === imgIdx ? 1 : 0.8, cursor: 'pointer' }}
          />
        ))}
      </div>

      {/* Subtitle */}
      <p ref={subRef} style={abs({ left: 20, top: 654, ...F.m500, fontSize: subFont, lineHeight: '23px', color: '#000', whiteSpace: 'nowrap' })}>{subtitle}</p>

      {/* Like (wishlist) + Share — heart turns pink once wishlisted */}
      <button onClick={handleHeart} aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'} style={abs({ left: 325, top: 654, width: 48, height: 48, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 })}>
        <MaskIcon name={wished ? 'imgAcHeartSolid' : 'imgAcHeart'} size={28} color={wished ? C.pink : DARK} />
      </button>
      <button style={abs({ left: 325, top: 713, width: 48, height: 48, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 })}>
        {PI('imgIcon9', 28, ['23.87%', '17.71%', '23.45%', '9.37%'])}
      </button>

      {/* Rating */}
      <div style={abs({ left: 20, top: 690, display: 'flex', gap: 4, alignItems: 'center' })}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {fullStar(20)}{fullStar(20)}{fullStar(20)}{fullStar(20)}{halfStar(20)}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', color: '#000', whiteSpace: 'nowrap', fontSize: 17 }}>
          <p style={F.m500}>{rating}</p>
          <p style={F.m300}>{count}</p>
        </div>
      </div>

      {/* Price */}
      <div style={abs({ left: 20, top: 737, display: 'flex', gap: 12, alignItems: 'center' })}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <p style={{ ...F.m400, fontSize: 19, color: '#000', whiteSpace: 'nowrap' }}>Price:</p>
          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {PI('imgVector3', 20, ['14%', '25.67%', '16%', '23.67%'])}
            <p style={{ ...F.m600, fontSize: 19, color: '#000', whiteSpace: 'nowrap' }}>{price}</p>
          </div>
        </div>
        <p style={{ ...F.m400, fontSize: 19, color: GRAY565, textDecoration: 'line-through', whiteSpace: 'nowrap' }}>{mrp}</p>
      </div>

      {/* Select Colors — hidden for bundles (no colour choice) */}
      {!bundle && (
      <div style={abs({ left: 20, top: 800, width: 353, height: 166, background: '#fff', border: `0.5px solid ${GRAY565}`, borderRadius: 10, overflow: 'hidden' })}>
        <p style={abs({ left: 27, top: 18, ...F.m500, fontSize: 17, color: '#000', whiteSpace: 'nowrap' })}>Select Colors</p>
        {(() => {
          const PAGE = 12;
          const pages = Math.ceil(colors.length / PAGE) || 1;
          const pg = Math.min(colorPage, pages - 1);
          const start = pg * PAGE;
          const visible = colors.slice(start, start + PAGE);
          const pick = (i) => {
            const c = colors[start + i];
            // Each colour is a separate product: switching colour loads that
            // product so image/text/price/rating/specs all refresh, and an
            // order records the selected variant. It also gets its own URL, so
            // a shared link reopens the exact colour that was being viewed.
            if (c?.id && c.id !== pid) navigate(productPath(c), { state: { product: c } });
            else setSelColor(start + i);
          };
          const btn = { border: 'none', background: 'none', padding: 0, cursor: 'pointer' };
          return (
            <>
              {pages > 1 && (
                <>
                  <button aria-label="Previous colours" onClick={() => setColorPage((p) => (Math.min(p, pages - 1) - 1 + pages) % pages)} style={abs({ left: 280, top: 7, ...btn })}>
                    {PI('imgIcon6', 32, caretInset)}
                  </button>
                  <button aria-label="Next colours" onClick={() => setColorPage((p) => (Math.min(p, pages - 1) + 1) % pages)} style={abs({ left: 312, top: 7, transform: 'scaleX(-1)', ...btn })}>
                    {PI('imgIcon6', 32, caretInset)}
                  </button>
                </>
              )}
              <div style={abs({ left: 27, top: 54, width: 320, display: 'flex', flexWrap: 'wrap', gap: 12 })}>
                <ColorSelector
                  colors={visible}
                  selected={selColor - start}
                  onSelect={pick}
                  onPrefetch={(i) => prefetchProduct(colors[start + i])}
                  size={40}
                  slots={visible.length}
                />
              </div>
            </>
          );
        })()}
      </div>
      )}

      {/* Feature strip */}
      <div style={abs({ left: 0, top: featureTop, width: 393, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 34px' })}>
        <FeatureItem icon={PI('imgVector', 32, ['10.42%', '6.25%', '10.41%', '6.25%'])} l1="All India" l2="Shipping" />
        <FeatureItem icon={PI('imgGroup1', 32, ['10.42%', '10.41%', '10.42%', '10.42%'], ['-1.97%', '-1.97%', '-1.97%', '-1.97%'])} l1="Easy" l2="Returns" />
        <FeatureItem icon={PI('imgGroup', 32, ['2.08%', '16.67%', '2.08%', '2.08%'], ['-1.63%', '-1.92%', '-1.63%', '-1.92%'])} l1="Cash on" l2="Delivery" />
      </div>

      {/* Select Size */}
      <div style={abs({ left: 20, top: sizeTop, width: 353, height: 132, background: '#fff', border: `0.5px solid ${GRAY565}`, borderRadius: 10, overflow: 'hidden' })}>
        <p style={abs({ left: 27, top: 18, ...F.m500, fontSize: 17, color: '#000', width: 96 })}>Select Size</p>
        {/* Left:24 + gap:13 fits all six sizes (6×40 + 5×13 = 305) symmetrically
            inside the 353-wide card; the old gap:25 pushed 4XL past the clipped edge. */}
        <div style={abs({ left: 24, top: 61, display: 'flex', gap: 13, alignItems: 'center' })}>
          {sizes.map((s, i) => (
            <SizeBtn key={s} label={s} selected={i === selSize} onClick={() => setSelSize(i)} />
          ))}
        </div>
        <p style={abs({ left: 261, top: 20, ...F.m500, fontSize: 14, color: '#000', whiteSpace: 'nowrap' })}>Size chart</p>
      </div>

      {/* Quantity + Add-to-Bag bar — inline "home" (just after the size chart).
          Shown here once docked; while floating, the viewport-level copy shows. */}
      <div ref={barRef} style={abs({ left: 0, top: barTop, width: 393, height: 72, visibility: floating ? 'hidden' : 'visible' })}>
        <BagBar qty={qty} onMinus={() => setQty((q) => Math.max(1, q - 1))} onPlus={() => setQty((q) => q + 1)} inBag={inBag} onPrimary={onPrimary} />
      </div>

      {/* Similar Products */}
      <p style={abs({ left: 20, top: similarTop, ...F.m500, fontSize: 19, color: '#000', whiteSpace: 'nowrap' })}>Similar Products</p>
      <div className="bt-scroll" style={abs({ left: 20, top: carouselTop, width: 373, height: 458, overflowX: 'auto', overflowY: 'hidden' })}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {bestSellers.length
            ? bestSellers.map((sp, i) => (
                <ProductCard key={i} variant="bs" product={sp} onClick={() => navigate(productPath(sp), { state: { product: sp } })} />
              ))
            : similarLoading
            ? Array.from({ length: 4 }).map((_, i) => <RailCardSkeleton key={'skel' + i} variant="bs" />)
            : null}
        </div>
      </div>

      {/* ===== Lower section: accordions → footer (flows; measured to size canvas) ===== */}
      <div ref={lowerRef} style={abs({ left: 0, top: lowerTop, width: 393, display: 'flex', flexDirection: 'column', paddingBottom: 40 })}>
        {/* Accordions */}
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 30 }}>
          <Accordion title="Product Details" isOpen={open.details} onToggle={() => toggle('details')} gap={18}>
            <p style={{ ...F.m400, fontSize: 19, color: BODY, lineHeight: '26px', width: '100%' }}>
              {detailsText}
            </p>
          </Accordion>
          <Divider />
          <Accordion title="Specifications" isOpen={open.specs} onToggle={() => toggle('specs')} gap={30}>
            <SpecContent rows={specRows} />
          </Accordion>
          <Divider />
          <Accordion title="Washing Instructions" isOpen={open.washing} onToggle={() => toggle('washing')} gap={40}>
            <WashingContent />
          </Accordion>
          <Divider />
          <Accordion
            title="Reviews"
            isOpen={open.reviews}
            onToggle={() => toggle('reviews')}
            gap={30}
            headerRight={
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {PI('imgIcon12', 21, starInset)}
                  <p style={{ ...F.m600, fontSize: 19, color: DARK }}>{rating}</p>
                </div>
                <p style={{ ...F.m400, fontSize: 15, color: DARK }}>{count}</p>
              </div>
            }
          >
            <ReviewsContent />
          </Accordion>
        </div>

        {/* SHOP footer */}
        <div style={{ marginTop: 40 }}>
          <ShopFooter shopRows={shopRows} />
        </div>

        {/* Logo + Follow us */}
        <div style={{ marginTop: 40, marginLeft: 20, display: 'flex', gap: 19, alignItems: 'flex-end' }}>
          <div style={{ width: 140, height: 89, position: 'relative' }}>
            <img src={passet('imgHdLogoPhotoroomTransparent2')} alt="Blutone" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ width: 193, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ ...F.m500, fontSize: 16, color: '#000', width: '100%' }}>Follow us</p>
            <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
              <Social name="imgUnion" inset={['11.98%', '29.06%', '11.98%', '28.65%']} href="https://www.facebook.com/blutone1481" label="Facebook" />
              <Social name="imgSubtract1" inset={['11.64%', '11.7%', '11.64%', '11.7%']} href="https://www.instagram.com/blu_tone.in/" label="Instagram" />
              <Social name="imgUnion1" inset={['7.81%', '10.94%', '11.98%', '10.94%']} href="https://www.linkedin.com/company/blutone/" label="LinkedIn" />
              <Social name="imgSubtract" inset={['8.33%', '8.33%', '9.01%', '8.68%']} href="https://wa.me/message/KZDYYZ7RE5BCK1" label="WhatsApp" />
            </div>
          </div>
        </div>

        {/* Divider above contact */}
        <div style={{ marginTop: 36, marginLeft: 20, width: 353, height: 1 }}>
          <img src={passet('imgLine11')} alt="" style={{ display: 'block', width: '100%', height: '100%', maxWidth: 'none' }} />
        </div>

        {/* Contact us */}
        <ContactUs style={{ marginTop: 27, marginLeft: 20 }} />

        {/* Divider below contact */}
        <div style={{ marginTop: 27, marginLeft: 20, width: 353, height: 1 }}>
          <img src={passet('imgLine11')} alt="" style={{ display: 'block', width: '100%', height: '100%', maxWidth: 'none' }} />
        </div>
      </div>
    </Frame>
    {/* Floating copy of the bar — sits just above the bottom nav, matched to the
        frame width, until the inline home docks it. */}
    {floating && (
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: vp.navH, width: vp.frameW, height: 72 * vp.scale, zIndex: 90, overflow: 'hidden' }}>
        <div style={{ width: 393, height: 72, transformOrigin: 'top left', transform: `scale(${vp.scale})` }}>
          <BagBar qty={qty} onMinus={() => setQty((q) => Math.max(1, q - 1))} onPlus={() => setQty((q) => q + 1)} inBag={inBag} onPrimary={onPrimary} />
        </div>
      </div>
    )}
    <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onSuccess={() => toggleWishlist(slug, sizes[selSize])} />
    </>
  );
}
