import './desktop.css';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { RailCardSkeleton, Spinner } from '../components/Loaders.jsx';
import ColorSelector from '../components/ColorSelector.jsx';
import DesktopHeader from './DesktopHeader.jsx';
import DesktopFooter from './DesktopFooter.jsx';
import { passet } from '../pdp/passet.js';
import { asset } from '../assets.js';
import { PRODUCT_DETAILS, SPEC_ROWS, WASH, reviewsFor, WashGlyph } from '../pdp/pdpContent.jsx';
import { sizesFor, colorsFor, imagesFor, defaultColorIndex, productPath, DEFAULT_PRODUCT_SLUG } from '../product.js';
import { getProduct, getProducts, prefetchProduct } from '../api/client.js';
import { trackViewContent, trackAddToCart } from '../lib/metaPixel.js';
import { productMeta } from '../data/products.js';
import { useAsync } from '../hooks/useApi.js';
import useSyncedImages from '../hooks/useSyncedImages.js';
import { useCart } from '../cart.jsx';
import { useAuth } from '../auth.jsx';
import { useWishlist } from '../wishlist.jsx';
import LoginModal from '../components/LoginModal.jsx';
import MaskIcon from '../components/MaskIcon.jsx';

const PI = (name, size, inset, inner, style) => <Icon src={passet(name)} size={size} inset={inset} inner={inner} style={style} />;
const starInset = ['10.41%', '6.62%', '10.25%', '6.62%'];
const halfInset = ['8.52%', '47.92%', '12.33%', '8.33%'];
const DEFAULT = { title: 'Golden Yellow Ankle Leggings', color: 'Golden Yellow', price: '350', mrp: '499', rating: '4.5', count: '(34)' };

const FABRICS = [
  { icon: 'imgFabAntiStatic', label: 'Anti Static' },
  { icon: 'imgFabBreathable', label: 'Breathable' },
  { icon: 'imgFabStretch', label: 'Super Stretch' },
  { icon: 'imgFabSoft', label: 'Soft Fabric' },
];

function AccContent({ which, detailsText, specPairs, reviews }) {
  if (which === 'details') return <p className="dtp-acc-text">{detailsText}</p>;
  if (which === 'specs') {
    const pairs = specPairs && specPairs.length ? specPairs : SPEC_ROWS.flatMap((r) => [[r[0], r[1]], [r[2], r[3]]]);
    return (
      <div className="dtp-spec">
        {pairs.map(([h, v], i) => (<div className="dtp-spec-cell" key={i}><p className="h">{h}</p><p className="v">{v}</p></div>))}
      </div>
    );
  }
  if (which === 'washing') {
    return (
      <div className="dtp-wash">
        {WASH.map((it, i) => (<div className="dtp-wash-item" key={i}><WashGlyph item={it} /><span>{it.label}</span></div>))}
      </div>
    );
  }
  return (
    <div className="dtp-reviews">
      {(reviews || []).map((rv, i) => (
        <div className="dtp-review" key={i}>
          <p>{rv.text}</p>
          <div className="meta"><span className="nm">{rv.name}</span><span className="badge">Verified</span></div>
        </div>
      ))}
    </div>
  );
}

const ACC_LEFT = [
  { key: 'details', title: 'Product Details' },
  { key: 'specs', title: 'Specifications' },
  { key: 'washing', title: 'Washing Instructions' },
];

export default function DesktopProduct() {
  const navigate = useNavigate();
  const { state } = useLocation();
  // The URL owns which product this is (/product/:slug) — shareable, and it
  // survives a reload. Router state is only an optional instant-paint hint.
  const { slug: slugParam } = useParams();
  const slug = slugParam || DEFAULT_PRODUCT_SLUG;
  const { data: detail, loading: detailLoading, error: detailError } = useAsync(() => getProduct(slug), [slug], null);
  const { data: similar, loading: similarLoading } = useAsync(() => getProducts({ tag: 'Best Selling' }), [], []);
  const bestSellers = similar || [];

  // Only trust the navigated-from card when it's really this product's card;
  // and `detail` still holds the PREVIOUS product while the next fetch is in
  // flight, so a matching hint outranks it: fresh detail > this card > stale.
  const hint = state?.product?.id === slug ? state.product : null;
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
  const colors = colorsFor(p);
  const sizes = sizesFor(p);
  // Gallery source: prefer the swatch/list item we navigated with (it carries
  // this colour's own gallery) over a `detail` that's still the previous
  // product. Then useSyncedImages holds the old photos until the whole incoming
  // set has loaded, so all four tiles swap in one render instead of popping in
  // one by one. Nothing about how the tiles look changes — only when.
  const gallerySrc = fresh || (hint?.images?.length ? hint : p);
  const { images } = useSyncedImages(imagesFor(gallerySrc).map((im) => asset(im)));
  // Spec/description come only from the full detail, and only once it's this
  // product's — a stale payload would describe the previous product.
  const detailsText = fresh?.description || PRODUCT_DETAILS;
  const specPairs = (fresh?.specs || []).map((s) => [s.label, s.value]);
  // Reviews: a stable, randomly-distributed slice of this product's category reviews.
  const productReviews = reviewsFor(p);
  const pid = p.id || slug;

  // Meta Pixel ViewContent — same contract as the mobile PDP: fires on the route
  // transition using the Content ID the master list already holds for this slug.
  const pixelProduct = fresh || hint || productMeta(slug);
  useEffect(() => {
    if (pixelProduct) trackViewContent(pixelProduct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
  // Bundles have no colour choice — the "Select Colors" box is hidden for them.
  const bundle = p.productType === 'bundle';
  // Breadcrumb trail reflects the real product (category slug/label + title)
  // instead of a hardcoded path. Bundles have no browsable category crumb.
  const catSlug = p.category && p.category !== 'bundle' ? p.category : null;
  const catLabel = (p.categoryLabel || (catSlug ? catSlug.replace(/-/g, ' ') : '')).toUpperCase();
  // Subtitle prefix ("<category>: <colour>"). Driven by the product's real
  // category so palazzos / pants / shapewear don't read "Leggings: Black".
  const catTitle = p.categoryLabel || (catSlug ? catSlug.replace(/-/g, ' ') : 'Leggings');

  const [selColor, setSelColor] = useState(() => defaultColorIndex(p));
  const [selSize, setSelSize] = useState(0);
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState({ details: true });
  const [added, setAdded] = useState(false);
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const { isAuthenticated } = useAuth();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const [loginOpen, setLoginOpen] = useState(false);
  const wished = isWishlisted(slug);
  const handleHeart = () => (!isAuthenticated ? setLoginOpen(true) : toggleWishlist(slug, sizes[selSize]));

  const { addItem, items } = useCart();
  // "In bag" = this product already added (any variant). Matches mobile: the
  // button then flips to GO TO BAG and opens the cart instead of adding again.
  const inBag = (items || []).some((x) => x.id === pid);
  const addToBag = () => {
    trackAddToCart({ ...p, id: pid }, { qty, price });
    addItem({ id: pid, category: p.category, title, img: p.img || 'imgPdpGoldenYellow', color: bundle ? color : colors[selColor]?.name, size: sizes[selSize], price, mrp, qty, shippingCharge: p.shippingCharge });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };
  const onPrimary = () => (inBag ? navigate('/bag') : addToBag());

  useEffect(() => {
    setSelColor(defaultColorIndex(p)); setSelSize(0); setQty(1); setOpen({ details: true }); setAdded(false); window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, detail]);

  const accItem = (a) => (
    <div className="dp2-acc-item" key={a.key}>
      <div className="dp2-acc-row" onClick={() => toggle(a.key)}>
        <span className="t">
          {a.title}
          {a.key === 'reviews' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 400, fontSize: 15 }}>
              {PI('imgIcon12', 20, starInset)}<span>{rating}</span><span style={{ color: '#565656' }}>{count}</span>
            </span>
          )}
        </span>
        <span className="car" style={{ transform: open[a.key] ? 'rotate(180deg)' : 'none' }}>▾</span>
      </div>
      {open[a.key] && <div className="dp2-acc-body"><AccContent which={a.key} detailsText={detailsText} specPairs={specPairs} reviews={productReviews} /></div>}
    </div>
  );

  // Opened from a shared link: nothing is known about the product until the
  // fetch lands, so wait rather than painting DEFAULT's photo/title/price.
  if (firstLoad || notFound) {
    return (
      <div className="dt">
        <DesktopHeader />
        <div className="dp2" style={{ minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {notFound ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', padding: '80px 0' }}>
              <p style={{ fontSize: 24, fontWeight: 600, color: '#212121' }}>Product not available</p>
              <p style={{ fontSize: 16, color: '#565656' }}>{detailError.message}</p>
              <button onClick={() => navigate('/list')} style={{ marginTop: 10, background: '#303136', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 28px', fontSize: 15, cursor: 'pointer' }}>
                BROWSE PRODUCTS
              </button>
            </div>
          ) : (
            <Spinner size={44} label="Loading product…" style={{ padding: '90px 0' }} />
          )}
        </div>
        <DesktopFooter />
      </div>
    );
  }

  return (
    <div className="dt">
      <DesktopHeader />
      <div className="dp2">
        <div className="dp2-crumb">
          <span onClick={() => navigate('/')}>HOME</span> | <span onClick={() => navigate('/list')}>WOMEN</span> | {catSlug && (<><span onClick={() => navigate(`/list?cat=${catSlug}`)}>{catLabel}</span> | </>)}<span className="on">{title.toUpperCase()}</span>
        </div>

        <div className="dp2-main">
          {/* Gallery */}
          <div className="dp2-gallery">
            <div className="dp2-grid">
              {[0, 1, 2].map((i) => (
                <div className="dp2-cell" key={i}><img src={images[i] || images[0]} alt={title} /></div>
              ))}
              {/* 4th cell: the product's 1st image as background with the 4
                  quality logos (from Figma) stacked vertically on the right. */}
              <div className="dp2-cell dp2-brand">
                <img className="bg" src={images[0]} alt={title} />
                <div className="dp2-brand-logos">
                  {[
                    { k: 'imgPdpLogo1', label: 'Anti Static' },
                    { k: 'imgPdpLogo2', label: 'Breathable' },
                    { k: 'imgPdpLogo3', label: 'Super Stretch' },
                    { k: 'imgPdpLogo4', label: 'Soft Fabric' },
                  ].map(({ k, label }) => (
                    <div className="lg" key={k}>
                      <img src={asset(k)} alt="" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="dp2-info">
            <h1 className="dp2-title">{title}</h1>
            <div className="dp2-cline">
              <span className="c">{catTitle}: {bundle ? color : (colors[selColor]?.name || color)}</span>
              <button className="dp2-iconbtn" onClick={handleHeart} aria-label="Wishlist"><MaskIcon name={wished ? 'imgAcHeartSolid' : 'imgAcHeart'} size={24} color={wished ? '#fa0789' : '#212121'} /></button>
            </div>
            <div className="dp2-rate">
              <span className="l">
                <span className="stars">{PI('imgIcon11', 24, starInset)}{PI('imgIcon11', 24, starInset)}{PI('imgIcon11', 24, starInset)}{PI('imgIcon11', 24, starInset)}{PI('imgIcon7', 24, halfInset)}</span>
                <span className="v">{rating}</span><span className="cnt">{count}</span>
              </span>
              <button className="dp2-iconbtn" aria-label="Share">{PI('imgIcon9', 24, ['23.87%', '17.71%', '23.45%', '9.37%'])}</button>
            </div>
            <div className="dp2-price">
              <span className="lbl">Price:</span>{PI('imgVector3', 20, ['14%', '25.67%', '16%', '23.67%'])}<span className="val">{price}</span><span className="mrp">{mrp}</span>
            </div>

            {!bundle && (
            <div className="dp2-box">
              <div className="dp2-box-head"><span className="t">Select Colors</span></div>
              {/* ColorSelector renders a bare fragment of circles, so it needs a
                  flex-wrap parent — without one the swatches sat edge to edge. */}
              <div className="dp2-swatches">
                <ColorSelector
                  colors={colors}
                  selected={selColor}
                  onSelect={(i) => { const c = colors[i]; if (c?.id && c.id !== pid) navigate(productPath(c), { state: { product: c } }); else setSelColor(i); }}
                  onPrefetch={(i) => prefetchProduct(colors[i])}
                  size={48}
                  slots={colors.length}
                />
              </div>
            </div>
            )}

            <div className="dp2-box">
              <div className="dp2-box-head"><span className="t">Select Size</span></div>
              <div className="dp2-sizes">
                {sizes.map((s, i) => (<button key={s} className={'dp2-size' + (i === selSize ? ' on' : '')} onClick={() => setSelSize(i)}>{s}</button>))}
              </div>
            </div>

            <div className="dp2-delivery"><img src={asset('imgFeatureDelivery')} alt="" width={28} height={28} />PAN INDIA DELIVERY</div>

            <div className="dp2-qty">
              <span className="lbl">Quantity:</span>
              <button className="dp2-qbtn" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span className="dp2-qval">{qty}</span>
              <button className="dp2-qbtn" onClick={() => setQty((q) => q + 1)}>+</button>
            </div>

            <button className="dp2-addbag" onClick={onPrimary} style={added ? { background: '#2e7d32' } : undefined}>
              {added ? 'ADDED TO BAG ✓' : inBag ? 'GO TO BAG' : <><MaskIcon name="imgAcBasket" size={22} color="#fff" />ADD TO BAG</>}
            </button>
          </div>
        </div>

        {/* Accordions */}
        <div className="dp2-acc-box">
          <div>{ACC_LEFT.map(accItem)}</div>
          <div>{accItem({ key: 'reviews', title: 'Reviews' })}</div>
        </div>
      </div>

      {/* Recommended */}
      <section className="dp2-rec">
        <h2>Recommended Products</h2>
        <div className="dp2-rail bt-scroll">
          {bestSellers.length
            ? bestSellers.map((sp, i) => (<ProductCard key={i} variant="bs" product={sp} onClick={() => navigate(productPath(sp), { state: { product: sp } })} />))
            : similarLoading
            ? Array.from({ length: 5 }).map((_, i) => <RailCardSkeleton key={'skel' + i} variant="bs" />)
            : null}
        </div>
      </section>

      <DesktopFooter />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onSuccess={() => toggleWishlist(slug, sizes[selSize])} />
    </div>
  );
}
