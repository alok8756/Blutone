import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './desktop.css';
import './desktopHome.css';
import { asset } from '../assets.js';
import Icon from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import DesktopHeader from './DesktopHeader.jsx';
import DesktopFooter from './DesktopFooter.jsx';
import { getHome, submitBulkOrder } from '../api/client.js';
import { productPath } from '../product.js';
import { useAsync } from '../hooks/useApi.js';
import { RailCardSkeleton } from '../components/Loaders.jsx';
import solidPhone from '../assets/solidPhone.svg';

const LEGGINGS = '/list?group=leggings';
// "Shop the Bundle" opens this product directly — it's direct-link-only (hidden
// from every listing/search). productType flags it so the PDP drops the colour
// chart immediately; the PDP fetches the rest by slug.
const BUNDLE_PRODUCT = {
  id: 'white-black-ankle-leggings-bundle-pack',
  title: 'White and Black Ankle Leggings Bundle Pack',
  productType: 'bundle',
  category: 'bundle',
  color: 'Black + White',
};
const starInset = ['10.41%', '6.62%', '10.25%', '6.62%'];
const halfInset = ['8.52%', '47.92%', '12.33%', '8.33%'];

/* ---------- Hero (2-slide auto carousel of full-bleed banner images) ---------- */
// Each slide is a complete designed banner (headline + "SHOP NOW" baked into the
// artwork), so the whole slide is the click target and routes to the leggings list.
// Cache-bust token for the hero banner art. The PNGs are replaced in place
// (same filename), so browsers keep serving the old cached bytes under the
// unchanged URL — appending ?v= forces a fresh fetch. Bump when re-exporting.
const HERO_V = '?v=3';
const HERO = [
  { img: 'imgWebHero1', alt: 'Effortless Bottoms — easy wear, utility looks, all-day comfort' },
  { img: 'imgWebHero2', alt: 'Modern Moves, Ethnic Roots — timeless ethnic style with all-day comfort' },
];  
function Hero({ onShop }) {
  const [i, setI] = useState(0);
  const n = HERO.length;
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) setI((c) => (c + 1) % n); }, 4000);
    return () => clearInterval(id);
  }, [n]);
  return (
    <section className="dh-hero">
      <div className="dh-hero-track" style={{ width: `${n * 100}%`, transform: `translateX(-${i * (100 / n)}%)` }}>
        {HERO.map((s) => (
          <button key={s.img} className="dh-hero-slide" style={{ flex: `0 0 ${100 / n}%` }} onClick={() => onShop(LEGGINGS)} aria-label="Shop now">
            <img src={asset(s.img) + HERO_V} alt={s.alt} />
          </button>
        ))}
      </div>
      <div className="dh-hero-dots">
        {HERO.map((s, idx) => (
          <button key={s.img} className={`dh-dot ${idx === i ? 'on' : ''}`} onClick={() => setI(idx)} aria-label={`Slide ${idx + 1}`} />
        ))}
      </div>
    </section>
  );
}

/* ---------- Feature strip ---------- */
function FeatureStrip() {
  const item = (t) => (
    <div className="dh-feat"><img src={asset('imgStarFill')} alt="" />{<span>{t}</span>}</div>
  );
  return (
    <section className="dh-featstrip">
      <div className="dh-featstrip-inner">
        {item('Soft Knits')}{item('Designed with elegance')}{item('Easy Returns')}{item('Made to Move')}
      </div>
    </section>
  );
}

/* ---------- Shop by Category ---------- */
// Each bubble opens its group's real categories via ?group= (resolved by the
// backend's explicit CATEGORY_GROUPS map), not a free-text ?q= name search.
const CATS = [
  { label: 'LEGGINGS', img: 'imgCatLeggings', to: '/list?group=leggings' },
  { label: 'PANTS', img: 'imgCatPants', to: '/list?group=pants' },
  { label: 'PALAZZOS', img: 'imgCatPalazzos', to: '/list?group=palazzos', pos: 'center 40%' },
  { label: 'SHAPEWEAR', img: 'imgCatShapewear', to: '/list?group=shapewear' },
];
function ShopByCategory({ onGo }) {
  return (
    <section className="dh-cats dh-wrap">
      <div className="dh-cat-head">
        <span className="rule" /><h2>SHOP BY CATEGORY</h2><span className="rule" />
      </div>
      <div className="dh-cat-grid">
        {CATS.map((c) => (
          <button key={c.label} className="dh-cat-card" onClick={() => onGo(c.to)}>
            <div className="img"><img src={asset(c.img)} alt={c.label} style={c.pos ? { objectPosition: c.pos } : undefined} /></div>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------- Blutone Essential ---------- */
function BlutoneEssential({ onShop }) {
  return (
    <section className="dh-essential">
      <div className="dh-essential-inner">
        <div className="dh-essential-text">
          <h2>Blutone Essential</h2>
          <p className="desc"><b>Black+ White Leggings</b> designed for high intensity movement.</p>
          <p className="price">Just at Rs. 550!!</p>
          <button className="dh-btn pink" onClick={onShop}>SHOP THE BUNDLE</button>
        </div>
        <div className="dh-essential-img"><img src={asset('imgWebBlutoneEssential')} alt="" /></div>
      </div>
    </section>
  );
}

/* ---------- Style Spotlight (coverflow of the 5 spotlight products) ---------- */
// Same 5 products + artwork as the mobile home spotlight; each card opens its
// own PDP. Desktop uses arrows / clickable side cards / dots in place of the
// mobile touch-swipe; centred card click opens the product.
const SPOTLIGHT = [
  { img: 'imgSpotRaniRose', slug: 'light-rani-rose-ankle-leggings', title: 'Light Rani Rose Ankle Leggings' },
  { img: 'imgSpotGoldenYellow', slug: 'golden-yellow-ankle-leggings', title: 'Golden Yellow Ankle Leggings' },
  { img: 'imgSpotStone', slug: 'stone-color-ankle-leggings', title: 'Stone Color Ankle Leggings' },
  { img: 'imgSpotLightSkin', slug: 'light-skin-ankle-leggings', title: 'Light Skin Ankle Leggings' },
  { img: 'imgSpotBabyPink', slug: 'baby-pink-ankle-leggings', title: 'Baby Pink Ankle Leggings' },
];
function StyleSpotlight({ onOpen }) {
  const n = SPOTLIGHT.length;
  const wrap = (i) => ((i % n) + n) % n;
  const [center, setCenter] = useState(0);
  const diffOf = (i) => { let d = i - center; if (d > 2) d -= n; if (d < -2) d += n; return d; };
  // Centre card is enlarged and sits on top (highest z), overlapping the two
  // side cards which are pulled inward and scaled down so the centre clearly
  // overlaps them (Figma coverflow look).
  const place = (d) => {
    if (d === 0) return { x: 0, s: 1.14, z: 5, o: 1 };
    if (d === 1) return { x: 245, s: 0.78, z: 4, o: 1 };
    if (d === -1) return { x: -245, s: 0.78, z: 4, o: 1 };
    if (d === 2) return { x: 430, s: 0.58, z: 2, o: 0 };
    return { x: -430, s: 0.58, z: 2, o: 0 };
  };
  return (
    <section className="dh-spot">
      <div className="dh-spot-inner dh-wrap">
        <h2>Style Spotlight Bottoms</h2>
        <div className="dh-spot-stage">
          <button className="dh-spot-arrow left" aria-label="Previous" onClick={() => setCenter((c) => wrap(c - 1))}>‹</button>
          {SPOTLIGHT.map((item, i) => {
            const d = diffOf(i);
            const p = place(d);
            return (
              <button
                key={item.slug}
                className="dh-spot-card"
                title={item.title}
                aria-label={d === 0 ? `Shop ${item.title}` : `Show ${item.title}`}
                onClick={() => (d === 0 ? onOpen(item) : setCenter(i))}
                style={{ transform: `translate(calc(-50% + ${p.x}px), -50%) scale(${p.s})`, zIndex: p.z, opacity: p.o, pointerEvents: p.o === 0 ? 'none' : 'auto' }}
              >
                <img src={asset(item.img)} alt={item.title} draggable={false} />
              </button>
            );
          })}
          <button className="dh-spot-arrow right" aria-label="Next" onClick={() => setCenter((c) => wrap(c + 1))}>›</button>
        </div>
        <div className="dh-spot-dots">
          {SPOTLIGHT.map((item, i) => (
            <button key={item.slug} className={`d ${i === center ? 'on' : ''}`} aria-label={`Go to ${item.title}`} onClick={() => setCenter(i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Best Quality Bottoms ---------- */
function BestQuality() {
  // Figma 447-2489: circular-ringed icon + two lines. Delivery has the bold line
  // on top; returns has the bold line on the bottom, so `boldTop` flips which
  // line is emphasised.
  const feat = (icon, top, bottom, boldTop) => (
    <div className="dh-bq-feat">
      <div className="ic"><img src={asset(icon)} alt="" /></div>
      <div className="tx">
        <p className={boldTop ? 'strong' : 'soft'}>{top}</p>
        <p className={boldTop ? 'soft' : 'strong'}>{bottom}</p>
      </div>
    </div>
  );
  return (
    <section className="dh-bestqual">
      <div className="dh-bestqual-inner">
        <img className="dh-bestqual-logo" src={asset('imgHdLogoPhotoroomTransparent1')} alt="Blutone" />
        <div className="dh-bestqual-sep" />
        <div className="dh-bestqual-feats">
          {feat('imgFeatureDelivery', 'PAN INDIA DELIVERY', 'on all orders, 365 days', true)}
          {/* The Figma "Icon/return" instance carries a stray DROP_SHADOW the
              delivery icon doesn't have; it exported into imgFeatureReturns.svg
              and read as a grey smudge on the flat band. The filter is now
              stripped from the asset itself, so mobile gets the clean glyph too. */}
          {feat('imgFeatureReturns', 'Hassel-free', 'EASY RETURNS', false)}
        </div>
      </div>
      <p className="dh-bestqual-tag">BEST QUALITY BOTTOMS AT BEST PRICE</p>
    </section>
  );
}

/* ---------- Our Craft ---------- */
function OurCraft({ onShop }) {
  return (
    <section className="dh-craft dh-wrap">
      <div className="dh-craft-box">
        <img src={asset('imgWebOurCraft')} alt="" />
        <div className="dh-craft-text">
          <div>
            <p className="ey">OUR CRAFT</p>
            <p className="q">Quietly considered.</p>
            <p className="b">Built to last.</p>
          </div>
          <p className="p">Every Blutone piece starts with a simple idea: clothing that moves effortlessly through your day. Crafted with premium fabrics that breathe, stretch, and last.</p>
          <button className="dh-btn" onClick={() => onShop(LEGGINGS)}>SHOP NOW</button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Product rail ---------- */
function Rail({ heading, items, variant, onOpen, onViewAll, loading }) {
  return (
    <section className="dh-rail-sec dh-wrap">
      <div className="dh-rail-head">
        <h2>{heading}</h2>
        <span className="va" onClick={onViewAll}>View all</span>
      </div>
      <div className="dh-rail bt-scroll">
        {items.length
          ? items.map((p, i) => <ProductCard key={i} variant={variant} product={p} onClick={() => onOpen(p)} />)
          : loading
          ? Array.from({ length: 5 }).map((_, i) => <RailCardSkeleton key={'skel' + i} variant={variant} />)
          : null}
      </div>
    </section>
  );
}

/* ---------- Stats band ---------- */
const STATS = [
  { big: '5M+', lbl: 'Happy Customers' },
  { big: '1000+', lbl: 'Bottom Collections' },
  { big: '150+', lbl: 'Colors & Prints' },
  { big: '4.8', lbl: 'Customer Ratings' },
];
function Stats() {
  return (
    <section className="dh-stats">
      <div className="dh-stats-inner">
        {STATS.map((s) => (
          <div className="dh-stat" key={s.big}><span className="big">{s.big}</span><span className="lbl">{s.lbl}</span></div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Order in Bulk ---------- */
// Real enquiry: POSTs to /bulk-orders (submitBulkOrder), name + phone required,
// with busy/error states and a "Call Now" dialer CTA — same behaviour as the
// mobile BulkOrderForm.
const CALL_TEL = '+919620425545';
function OrderInBulk() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError(''); };
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (!form.name.trim()) { setError('Please enter your name.'); return; }
    if (!form.phone.trim()) { setError('Please enter your mobile number.'); return; }
    setBusy(true);
    try {
      await submitBulkOrder({ name: form.name, phone: form.phone, email: form.email, message: form.message });
      setForm({ name: '', phone: '', email: '', message: '' });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not submit your enquiry. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="dh-bulk dh-wrap">
      <div className="dh-bulk-box">
        <div className="dh-bulk-img"><img src={asset('imgWebOrderBulk')} alt="" /></div>
        <form className="dh-bulk-form" onSubmit={submit}>
          <h2>ORDER IN BULK</h2>
          {done ? (
            <div className="dh-bulk-done">
              <p className="ty">Thank you!</p>
              <p className="sub">Your bulk enquiry has been received. Our team will reach out to you shortly.</p>
              <button type="button" className="dh-bulk-submit" onClick={() => setDone(false)}>Submit another</button>
            </div>
          ) : (
            <>
              <div className="dh-field"><label>Name</label><input value={form.name} onChange={set('name')} placeholder="Your name" /></div>
              <div className="dh-field"><label>Phone number</label><input type="tel" value={form.phone} onChange={set('phone')} placeholder="Your phone no" /></div>
              <div className="dh-field"><label>Email id</label><input type="email" value={form.email} onChange={set('email')} placeholder="Your email id" /></div>
              <div className="dh-field"><label>Message</label><textarea value={form.message} onChange={set('message')} placeholder="Write your query." /></div>
              {error && <p className="dh-bulk-error">{error}</p>}
              <button className="dh-bulk-submit" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Enquire Now'}</button>
              <div className="dh-bulk-or"><span />or<span /></div>
              <a className="dh-bulk-call" href={`tel:${CALL_TEL}`} aria-label="Call now">
                <span className="ic"><img src={solidPhone} alt="" /></span>Call Now
              </a>
            </>
          )}
        </form>
      </div>
    </section>
  );
}

/* ---------- Customer Reviews (auto-rotating, same 3 as mobile) ---------- */
const REVIEWS = [
  { title: 'Product quality is awesome.', name: 'Sneha Sharma', product: 'Blue Cotton Leggings' },
  { title: 'Product was delivered on time.', name: 'Rashmi Sahay', product: 'Green Chudidar Leggings' },
  { title: 'Great product!! Thanks.', name: 'Aanya Gupta', product: 'Pink Ankle Leggings' },
];
function Reviews() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % REVIEWS.length), 3000);
    return () => clearInterval(t);
  }, []);
  const r = REVIEWS[idx];
  return (
    <section className="dh-reviews">
      <div className="dh-reviews-box">
        <h2>CUSTOMER REVIEWS</h2>
        <div className="dh-reviews-rating">
          {/* Gold stars (#FFCC00): imgIcon11 / imgIcon12 are the golden-yellow
              twins of the black imgIcon4 / imgIcon3 — identical aspect ratios
              (1.093 and 0.553), so the geometry is unchanged. */}
          <span className="stars">
            <Icon name="imgIcon11" size={30} inset={starInset} /><Icon name="imgIcon11" size={30} inset={starInset} /><Icon name="imgIcon11" size={30} inset={starInset} /><Icon name="imgIcon11" size={30} inset={starInset} /><Icon name="imgIcon12" size={30} inset={halfInset} />
          </span>
          <span className="val">4.5</span><span className="cnt">(725)</span>
        </div>
        <div className="dh-review-card" key={idx}>
          <div className="q">{r.title}</div>
          <div className="stars">{[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="imgIcon9" size={26} inset={starInset} />)}</div>
          <div className="who">{r.name}<img src={asset('imgRiVerifiedBadgeFill')} alt="verified" width="26" height="26" /></div>
          <div className="prod">{r.product}</div>
        </div>
        <div className="dh-review-dots">
          {REVIEWS.map((rev, i) => (
            <button key={i} className={`d ${i === idx ? 'on' : ''}`} aria-label={`Review ${i + 1}`} onClick={() => setIdx(i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function DesktopHome() {
  const navigate = useNavigate();
  const go = (to) => navigate(to);
  const openProduct = (product) => navigate(productPath(product), { state: { product } });
  const { data: home, loading: homeLoading } = useAsync(getHome, [], {});
  const newArrivals = home?.newArrivals || [];
  const bestSellers = home?.bestSellers || [];

  return (
    <div className="dh">
      <DesktopHeader />
      <Hero onShop={go} />
      <FeatureStrip />
      <ShopByCategory onGo={go} />
      <BlutoneEssential onShop={() => openProduct(BUNDLE_PRODUCT)} />
      <StyleSpotlight onOpen={(item) => openProduct({ id: item.slug, title: item.title })} />
      <BestQuality />
      <OurCraft onShop={go} />
      <Rail heading="NEW ARRIVALS" items={newArrivals} variant="na" onOpen={openProduct} onViewAll={() => navigate('/list')} loading={homeLoading} />
      <Stats />
      <Rail heading="BEST SELLING" items={bestSellers} variant="bs" onOpen={openProduct} onViewAll={() => navigate('/list')} loading={homeLoading} />
      <OrderInBulk />
      <Reviews />
      <DesktopFooter />
    </div>
  );
}
