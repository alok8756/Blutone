import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Frame from './components/Frame.jsx';
import Icon from './components/Icon.jsx';
import MaskIcon from './components/MaskIcon.jsx';
import ProductCard from './components/ProductCard.jsx';
import { RailCardSkeleton } from './components/Loaders.jsx';
import BannerCarousel from './components/BannerCarousel.jsx';
import BulkOrderForm from './components/BulkOrderForm.jsx';
import ContactUs from './components/ContactUs.jsx';
import { asset } from './assets.js';
import { C, F } from './tokens.js';
import { getHome, getSuggestions } from './api/client.js';
import { productPath } from './product.js';
import { useAsync, useDebounced } from './hooks/useApi.js';
import { useAuth } from './auth.jsx';
import LoginModal from './components/LoginModal.jsx';
import ConfirmModal from './components/ConfirmModal.jsx';

/*
 * Home — rebuilt to match Figma 173:2071. Pixel-perfect absolute layout on the
 * scaled 393-wide <Frame>. Exact colours/fonts/text from the design; product
 * carousels + stats content come from the /home API. All "SHOP NOW" CTAs go to
 * the product list by default.
 */
const abs = (s) => ({ position: 'absolute', ...s });

// Exact palette values from the Figma design tokens (navy / pink / lightblue scales).
const PINK = { p50: '#ffecf1', p100: '#ffdde6', p200: '#ffb9ce', p300: '#fe92b7', p500: '#fa0789', p600: '#c6046b', p700: '#9a0252', p800: '#6c0138', p900: '#420020', p950: '#2b0012' };
const NAVY = { n50: '#f3f3f6', n100: '#e7e8ee', n200: '#cfd1dd', n300: '#b7bbcc', n400: '#a0a5bc', n500: '#8990ac', n600: '#727b9c', n700: '#606783', n800: '#4e546b', n900: '#3c4154', n950: '#20232f' };
const italic = { fontStyle: 'italic' };

/* ---------- header (reused) ---------- */
function Logo() {
  return (
    <div style={abs({ left: 20, top: 66, width: 61, height: 39 })}>
      <img src={asset('imgHdLogoPhotoroomTransparent1')} alt="Blutone" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  );
}

function SearchBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const dq = useDebounced(q.trim(), 200);
  const { data: matches } = useAsync(() => (dq ? getSuggestions(dq) : Promise.resolve([])), [dq], []);
  const suggestions = focused ? (matches || []) : [];
  const go = (term) => {
    const t = (term ?? q).trim();
    if (!t) return;
    setFocused(false); setQ('');
    navigate(`/list?q=${encodeURIComponent(t)}`);
  };
  return (
    <>
      <div style={abs({ left: 94, top: 69, width: 221, height: 33, border: `0.5px solid ${C.slate}`, borderRadius: 30, display: 'flex', alignItems: 'center', padding: '0 10px', zIndex: 60 })}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
          <Icon name="imgIcon10" size={24} inset={['14.26%', '13.25%', '13.25%', '14.26%']} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 120)}
            onKeyDown={(e) => { if (e.key === 'Enter') go(); }}
            placeholder="Search your product..."
            style={{ ...F.m400, fontSize: 15, color: C.black, border: 'none', outline: 'none', background: 'transparent', width: '100%', padding: 0 }}
          />
        </div>
      </div>
      {suggestions.length > 0 && (
        <div style={abs({ left: 94, top: 104, width: 221, background: C.white, border: `0.5px solid ${C.slate}`, borderRadius: 12, padding: '6px 0', zIndex: 70, boxShadow: '0px 4px 16px rgba(0,0,0,0.12)' })}>
          {suggestions.map((s) => (
            <p key={s} onMouseDown={(e) => { e.preventDefault(); go(s); }} style={{ ...F.m400, fontSize: 14, color: C.gray, padding: '8px 14px', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s}</p>
          ))}
        </div>
      )}
    </>
  );
}

function LoginButton({ onClick, label, authed }) {
  return (
    <button onClick={onClick} style={abs({ left: 320, top: 66, width: 60, border: 'none', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', padding: 0 })}>
      {authed ? <MaskIcon name="imgAcSmile" size={24} color={C.black} /> : <Icon name="imgIcon" size={24} inset={['17.71%', '17.71%', '17.71%', '13.54%']} />}
      <p style={{ ...F.m500, fontSize: 12, color: C.black, textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
    </button>
  );
}

/* ---------- headings / carousel (reused) ---------- */
// Section headings use Cormorant Garamond at the exact weights/colours from Figma.
function SectionHeading({ text, top, left = 20, font = F.cormorant500, color = NAVY.n950 }) {
  return <p style={abs({ left, top, ...font, fontSize: 22, color })}>{text}</p>;
}
function ViewAll({ left, top, onClick }) {
  return <p onClick={onClick} style={abs({ left, top, ...F.m400, fontSize: 17, color: C.gray, textDecoration: 'underline', whiteSpace: 'nowrap', cursor: 'pointer' })}>View all</p>;
}
function Carousel({ left, top, width, height, children }) {
  return (
    <div className="bt-scroll" style={abs({ left, top, width, height, overflowX: 'auto', overflowY: 'hidden' })}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', width: 'max-content' }}>{children}</div>
    </div>
  );
}

/* ---------- new sections ---------- */
function AnnouncementStrip() {
  const MSG = 'Bundle pack at just Rs. 550 | Pan INDIA Delivery';
  // One "group" repeats the message a few times; two identical groups form the
  // scrolling track (see .bt-marquee in index.css) for a seamless loop.
  const group = (
    <div style={{ display: 'flex', flexShrink: 0 }} aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <span key={i} style={{ ...F.m500, fontSize: 13, color: PINK.p50, whiteSpace: 'nowrap', paddingRight: 48 }}>{MSG}</span>
      ))}
    </div>
  );
  return (
    <div style={abs({ left: 0, top: 114, width: 393, height: 27, background: PINK.p600, overflow: 'hidden', display: 'flex', alignItems: 'center' })}>
      <div className="bt-marquee">{group}{group}</div>
    </div>
  );
}

function FeatureBadges() {
  const badge = (text) => (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <img src={asset('imgStarFill')} alt="" width={20} height={20} style={{ display: 'block' }} />
      <span style={{ ...F.cormorant500, ...italic, fontSize: 20, color: PINK.p50, whiteSpace: 'nowrap' }}>{text}</span>
    </div>
  );
  return (
    <div style={abs({ left: 0, top: 605, width: 393, height: 80, background: NAVY.n900 })}>
      <div style={abs({ left: 22, top: 13, width: 349, display: 'flex', flexDirection: 'column', gap: 6 })}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {badge('Soft Knits')}{badge('Designed with Elegance')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 42 }}>
          {badge('Easy Returns')}{badge('Made to Move')}
        </div>
      </div>
    </div>
  );
}

// Each bubble opens its group's real categories via ?group= (resolved by the
// backend's explicit CATEGORY_GROUPS map). These used to be free-text searches
// (?q=Pant), which matched on product NAME and so pulled in anything that
// happened to contain the word — and missed correctly-categorised products
// whose name didn't.
const CATEGORY_CARDS = [
  { label: 'LEGGINGS', img: 'imgCatLeggings', to: '/list?group=leggings' },
  { label: 'PANTS', img: 'imgCatPants', to: '/list?group=pants' },
  { label: 'PALAZZOS', img: 'imgCatPalazzos', to: '/list?group=palazzos', pos: 'center 79%' },
  { label: 'SHAPEWARE', img: 'imgCatShapewear', to: '/list?group=shapewear' },
];
function ShopByCategory() {
  const navigate = useNavigate();
  const card = (c) => (
    <button
      key={c.label}
      onClick={() => navigate(c.to)}
      style={{ width: 170, boxSizing: 'border-box', border: `3px solid ${PINK.p300}`, background: `linear-gradient(179.9deg, ${PINK.p50} 4%, ${PINK.p100} 66%, ${PINK.p200} 92%)`, padding: '15px 15px 20px', display: 'flex', flexDirection: 'column', gap: 13, alignItems: 'center', cursor: 'pointer' }}
    >
      <div style={{ width: 140, height: 140, overflow: 'hidden' }}>
        <img src={asset(c.img)} alt={c.label} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: c.pos || 'center 15%' }} />
      </div>
      <span style={{ ...F.m600, fontSize: 20, lineHeight: 1.25, color: PINK.p900, textAlign: 'center' }}>{c.label}</span>
    </button>
  );
  return (
    <div style={abs({ left: 20, top: 724, width: 353, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' })}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {/* Side rules use Color/Navy/Navy 500 (#8990ac) — matches desktop. */}
        <div style={{ width: 47, height: 1, background: NAVY.n500 }} />
        <p style={{ ...F.cormorant600, fontSize: 22, color: NAVY.n950, whiteSpace: 'nowrap' }}>SHOP BY CATEGORY</p>
        <div style={{ width: 47, height: 1, background: NAVY.n500 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13, width: '100%' }}>
        <div style={{ display: 'flex', gap: 13 }}>{card(CATEGORY_CARDS[0])}{card(CATEGORY_CARDS[1])}</div>
        <div style={{ display: 'flex', gap: 13 }}>{card(CATEGORY_CARDS[2])}{card(CATEGORY_CARDS[3])}</div>
      </div>
    </div>
  );
}

// The "Shop the Bundle" CTA opens this product directly (it's a direct-link-only
// product — not shown in any listing/search). Minimal fields for instant header
// render; the PDP fetches the rest by slug. productType flags it as a bundle so
// the PDP hides the colour chart immediately (no flash before the detail loads).
const BUNDLE_PRODUCT = {
  id: 'white-black-ankle-leggings-bundle-pack',
  title: 'White and Black Ankle Leggings Bundle Pack',
  productType: 'bundle',
  category: 'bundle',
  color: 'Black + White',
};

function BlutoneEssentials({ onShop }) {
  return (
    <div style={abs({ left: 0, top: 1253, width: 393, height: 256, background: NAVY.n200, overflow: 'hidden' })}>
      <div style={abs({ left: 220, top: 0, width: 192, height: 256, overflow: 'hidden' })}>
        <img src={asset('imgBlutoneEssentials')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
      </div>
      <div style={abs({ left: 21, top: 12, width: 122, ...F.cormorant600, ...italic, fontSize: 34, color: '#000', lineHeight: '30px' })}>
        <p style={{ margin: 0 }}>Blutone</p>
        <p style={{ margin: 0 }}>Essentials</p>
      </div>
      <p style={abs({ left: 21, top: 81, width: 188, fontSize: 16, color: NAVY.n900, lineHeight: '22px' })}>
        <span style={F.m500}>Black+ White Leggings </span>
        <span style={F.m400}>designed for high intensity movement.</span>
      </p>
      <p style={abs({ left: 21, top: 156, ...F.m600, ...italic, fontSize: 22, color: PINK.p700, whiteSpace: 'nowrap' })}>Just at Rs. 550!!</p>
      <button onClick={onShop} style={abs({ left: 21, top: 200, background: PINK.p600, border: 'none', padding: '10px 12px', cursor: 'pointer' })}>
        <span style={{ ...F.m500, fontSize: 13, color: C.white, whiteSpace: 'nowrap' }}>SHOP THE BUNDLE</span>
      </button>
    </div>
  );
}

// 5 spotlight cards → each links to its product page. Coverflow: the centred
// card is large; neighbours shrink. Drag/swipe left-right to rotate; tapping a
// side card centres it, tapping the centre card opens that product.
// `btn` is the transparent hit-area over the "SHOP NOW" painted into each image,
// in the 244×372 card coordinate space (differs per image — the CTA is placed
// differently in each artwork). Rani Rose is exact from Figma (Frame 248); the
// rest are measured from the artwork and can be nudged if any feels off.
const SPOTLIGHT = [
  { img: 'imgSpotRaniRose', slug: 'light-rani-rose-ankle-leggings', title: 'Light Rani Rose Ankle Leggings', btn: { left: 74, top: 118, width: 98, height: 40 } },
  { img: 'imgSpotGoldenYellow', slug: 'golden-yellow-ankle-leggings', title: 'Golden Yellow Ankle Leggings', btn: { left: 12, top: 314, width: 92, height: 40 } },
  { img: 'imgSpotStone', slug: 'stone-color-ankle-leggings', title: 'Stone Color Ankle Leggings', btn: { left: 104, top: 68, width: 96, height: 40 } },
  { img: 'imgSpotLightSkin', slug: 'light-skin-ankle-leggings', title: 'Light Skin Ankle Leggings', btn: { left: 76, top: 62, width: 92, height: 42 } },
  { img: 'imgSpotBabyPink', slug: 'baby-pink-ankle-leggings', title: 'Baby Pink Ankle Leggings', btn: { left: 70, top: 84, width: 92, height: 42 } },
];
function StyleSpotlight() {
  const navigate = useNavigate();
  const n = SPOTLIGHT.length;
  const wrap = (i) => ((i % n) + n) % n;
  const [center, setCenter] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(null);
  const startY = useRef(null);
  const moved = useRef(false);
  const downIdx = useRef(null);
  const THRESHOLD = 40;
  const diffOf = (i) => { let d = i - center; if (d > 2) d -= n; if (d < -2) d += n; return d; };
  const openProduct = (item) => navigate(productPath(item.slug), { state: { product: { id: item.slug, title: item.title } } });

  const onDown = (e) => {
    startX.current = e.clientX; startY.current = e.clientY; moved.current = false; setDragging(true);
    const el = e.target.closest?.('[data-idx]');
    downIdx.current = el ? Number(el.getAttribute('data-idx')) : null;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    // Any real horizontal drag OR vertical scroll disqualifies this from being a tap.
    if (Math.abs(dx) > 6 || Math.abs(dy) > 8) moved.current = true;
    setDrag(dx);
  };
  const onUp = () => {
    if (startX.current == null) return;
    const dx = drag; startX.current = null; startY.current = null; setDragging(false); setDrag(0);
    // A tap (no real drag) only re-centres a tapped side card. The product page
    // opens ONLY from the "SHOP NOW" hit-area painted into each image (below).
    if (!moved.current && downIdx.current != null) {
      if (diffOf(downIdx.current) !== 0) setCenter(downIdx.current);
      return;
    }
    if (dx <= -THRESHOLD) setCenter((c) => wrap(c + 1));
    else if (dx >= THRESHOLD) setCenter((c) => wrap(c - 1));
  };
  // Browser hijacked the gesture for vertical page scroll: reset, never navigate.
  const onCancel = () => {
    if (startX.current == null) return;
    startX.current = null; startY.current = null; setDragging(false); setDrag(0);
  };

  const placement = (diff) => {
    if (diff === 0) return { x: 0, scale: 1, z: 5, op: 1 };
    if (diff === 1) return { x: 132, scale: 0.6, z: 4, op: 1 };
    if (diff === -1) return { x: -132, scale: 0.6, z: 4, op: 1 };
    if (diff === 2) return { x: 208, scale: 0.44, z: 2, op: 0 };
    return { x: -208, scale: 0.44, z: 2, op: 0 };
  };

  return (
    <div style={abs({ left: 0, top: 1554, width: 393, height: 526, overflow: 'hidden', background: `linear-gradient(180deg, ${PINK.p600} 0%, ${PINK.p500} 21%, ${PINK.p700} 91%, ${NAVY.n900} 100%)` })}>
      <p style={abs({ left: '50%', transform: 'translateX(-50%)', top: 30, ...F.cormorant700, fontSize: 32, color: C.offwhite, whiteSpace: 'nowrap' })}>Style Spotlight Bottoms</p>
      <div
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel}
        style={abs({ left: 0, top: 100, width: 393, height: 400, touchAction: 'pan-y', cursor: dragging ? 'grabbing' : 'grab' })}
      >
        {SPOTLIGHT.map((item, i) => {
          const diff = diffOf(i);
          const p = placement(diff);
          return (
            <div
              key={item.slug}
              data-idx={i}
              title={item.title}
              style={{ position: 'absolute', left: '50%', top: 0, width: 244, height: 372, marginLeft: -122, transformOrigin: 'center center', transform: `translateX(${p.x + drag}px) scale(${p.scale})`, zIndex: p.z, opacity: p.op, transition: dragging ? 'none' : 'transform 0.35s ease, opacity 0.35s ease', borderRadius: 24, overflow: 'hidden', boxShadow: '0 10px 26px rgba(0,0,0,0.28)', cursor: 'pointer', userSelect: 'none' }}
            >
              <img src={asset(item.img)} alt={item.title} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
              {/* Transparent hit-area over the "SHOP NOW" painted into the image.
                  Opens the product only when this card is centred; on a side card
                  it just brings the card to the centre. Disabled on hidden cards. */}
              <button
                aria-label="Shop Now"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); if (diff === 0) openProduct(item); else setCenter(i); }}
                style={{ position: 'absolute', left: item.btn.left, top: item.btn.top, width: item.btn.width, height: item.btn.height, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', pointerEvents: p.op === 0 ? 'none' : 'auto' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeatureCardsRow() {
  const fcard = (icon, title, sub) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
      <div style={{ width: 42, height: 42, boxSizing: 'border-box', border: `2px solid ${NAVY.n900}`, borderRadius: 21, padding: 6, flexShrink: 0 }}>
        <img src={asset(icon)} alt="" width={30} height={30} style={{ display: 'block' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <p style={{ ...F.m600, fontSize: 16, color: NAVY.n900 }}>{title}</p>
        <p style={{ ...F.m500, fontSize: 15, color: NAVY.n800 }}>{sub}</p>
      </div>
    </div>
  );
  return (
    <div style={abs({ left: 0, top: 2125, width: 393, height: 168, background: NAVY.n200 })}>
      <div style={abs({ left: 18, top: 22, width: 354, display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
        <div style={{ width: 91, height: 57, flexShrink: 0 }}>
          <img src={asset('imgHdLogoPhotoroomTransparent1')} alt="Blutone" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ width: 248, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fcard('imgFeatureDelivery', 'PAN INDIA DELIVERY', 'on all orders, 365 days')}
          {fcard('imgFeatureReturns', 'Easy Returns', 'hassel-free')}
        </div>
      </div>
      <div style={abs({ left: 0, top: 131, width: 393, height: 37, background: NAVY.n400, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
        <p style={{ ...F.m500, fontSize: 18, color: NAVY.n950, whiteSpace: 'nowrap' }}>Best Quality Bottoms at Best Price</p>
      </div>
    </div>
  );
}

function OurCraft({ onShop }) {
  // Absolute layout matching Figma 1284:8635. The image fill is scaled/offset
  // exactly as in the design (116.51% × 137.4%, top -11.01%, left 0).
  return (
    <div style={abs({ left: 20, top: 2338, width: 353, height: 365, borderRadius: 20, overflow: 'hidden' })}>
      <img src={asset('imgOurCraft')} alt="" draggable={false} style={{ position: 'absolute', left: 0, top: '-11.01%', width: '116.51%', height: '137.4%', maxWidth: 'none', objectFit: 'cover', pointerEvents: 'none' }} />
      {/* heading */}
      <div style={abs({ left: 27, top: 37, width: 138, display: 'flex', flexDirection: 'column', gap: 6 })}>
        <p style={{ ...F.m500, fontSize: 13, color: PINK.p800, letterSpacing: '0.52px' }}>OUR CRAFT</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <p style={{ ...F.cormorant600, fontSize: 18, color: PINK.p700 }}>Quietly considered.</p>
          <p style={{ ...F.cormorant700, fontSize: 24, color: PINK.p950 }}>Build to last.</p>
        </div>
      </div>
      {/* translucent panel behind the paragraph for legibility */}
      <div style={abs({ left: 27, top: 120, width: 150, height: 125, background: 'rgba(255,255,255,0.2)' })} />
      <p style={abs({ left: 39, top: 134, width: 138, ...F.m400, fontSize: 12, lineHeight: '20px', color: NAVY.n950 })}>Every Blutone piece starts with a simple idea: clothing that moves effortlessly through your day. </p>
      {/* CTA */}
      <button onClick={onShop} style={abs({ left: 27, top: 267, background: NAVY.n900, border: 'none', padding: '12px 16px', cursor: 'pointer' })}>
        <span style={{ ...F.m500, fontSize: 16, color: C.white, whiteSpace: 'nowrap' }}>SHOP NOW</span>
      </button>
    </div>
  );
}

const STATS = [
  { big: '5M+', l1: 'Happy', l2: 'Customers', bg: NAVY.n950 },
  { big: '1000+', l1: 'Bottomwear', l2: 'Collections', bg: NAVY.n950 },
  { big: '4.8', l1: 'Customers', l2: 'Rating', bg: NAVY.n950 },
  { big: '150+', l1: 'Colors &', l2: 'Prints', bg: NAVY.n950 },
];
function StatsSection() {
  const card = (s) => (
    <div key={s.big} style={{ width: 167, boxSizing: 'border-box', background: s.bg, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ ...F.m600, fontSize: 22, color: NAVY.n50 }}>{s.big}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, ...F.m500, fontSize: 18, color: NAVY.n100 }}>
        <p style={{ margin: 0 }}>{s.l1}</p><p style={{ margin: 0 }}>{s.l2}</p>
      </div>
    </div>
  );
  return (
    <div style={abs({ left: 0, top: 3297, width: 393, height: 314, backgroundColor: NAVY.n700, backgroundImage: `url(${asset('imgStatsBg')})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', boxSizing: 'border-box' })}>
      <div style={abs({ left: 21, top: 24, width: 351, display: 'flex', flexDirection: 'column', gap: 18 })}>
        <div style={{ display: 'flex', gap: 17 }}>{card(STATS[0])}{card(STATS[1])}</div>
        <div style={{ display: 'flex', gap: 17 }}>{card(STATS[2])}{card(STATS[3])}</div>
      </div>
    </div>
  );
}

const Star24 = ({ name = 'imgIcon4' }) => <Icon name={name} size={24} inset={['10.41%', '6.62%', '10.25%', '6.62%']} />;
const StarHalf24 = () => <Icon name="imgIcon3" size={24} inset={['8.52%', '47.92%', '12.33%', '8.33%']} />;

// Rotating customer reviews (Figma 1680:8811 / 1680:8830). #0 is the original
// card; the two new ones cycle in every 3s. Background stays the current lilac.
const REVIEWS = [
  { title: 'Product quality is awesome.', name: 'Sneha Sharma', product: 'Blue Cotton Leggings' },
  { title: 'Product was delivered on time.', name: 'Rashmi Sahay', product: 'Green Chudidar Leggings' },
  { title: 'Great product!! Thanks.', name: 'Aanya Gupta', product: 'Pink Ankle Leggings' },
];

function CustomerReviews() {
  // Auto-advance through REVIEWS every 3s; the key change re-triggers the fade-in.
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % REVIEWS.length), 3000);
    return () => clearInterval(t);
  }, []);
  const r = REVIEWS[idx];
  return (
    <>
      <p style={abs({ left: '50%', transform: 'translateX(-50%)', top: 4959, ...F.m500, fontSize: 20, color: C.black, whiteSpace: 'nowrap' })}>CUSTOMER REVIEWS</p>
      <div style={abs({ left: '50%', transform: 'translateX(-50%)', top: 4995, display: 'flex', gap: 12, alignItems: 'center' })}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Star24 /><Star24 /><Star24 /><Star24 /><StarHalf24 /></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: C.black, whiteSpace: 'nowrap' }}>
          <p style={{ ...F.m600, fontSize: 28 }}>4.5</p><p style={{ ...F.m400, fontSize: 18 }}>(725)</p>
        </div>
      </div>
      <div style={abs({ left: 0, top: 5049, width: 393, height: 193, background: C.lilac60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box', overflow: 'hidden' })}>
        <div key={idx} className="bt-review" style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <p style={{ ...F.m500, fontSize: 16, color: C.black, textAlign: 'center', whiteSpace: 'nowrap' }}>{r.title}</p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Star24 name="imgIcon9" /><Star24 name="imgIcon9" /><Star24 name="imgIcon9" /><Star24 name="imgIcon9" /><Star24 name="imgIcon9" />
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <p style={{ ...F.m600, fontSize: 16, color: C.black, whiteSpace: 'nowrap' }}>{r.name}</p>
            <div style={{ width: 16, height: 16 }}><img src={asset('imgRiVerifiedBadgeFill')} alt="" style={{ width: '100%', height: '100%' }} /></div>
          </div>
          <p style={{ ...F.m400, fontSize: 16, color: C.black, textAlign: 'center', whiteSpace: 'nowrap' }}>{r.product}</p>
        </div>
        <style>{`
          @keyframes btReviewFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          .bt-review { animation: btReviewFade 0.6s ease; }
        `}</style>
      </div>
    </>
  );
}

/* ---------- footer ---------- */
const SHOP_ROWS = [
  ['Ankle Leggings', 'Palazzos Pant', 'Jumbo Pant'],
  ['Churidar Leggings', 'Jumbo Palazzos'],
  ['Kids Leggings', 'Patiyala Pant', 'Shape wear'],
  ['Straight Pant', 'Shimmer Leggings'],
];
const SOCIALS = [
  { icon: 'imgFbIcon', label: 'Facebook', href: 'https://www.facebook.com/share/19BafBeTBd/' },
  { icon: 'imgIgIcon', label: 'Instagram', href: 'https://www.instagram.com/blu_tone.in/' },
  { icon: 'imgWaIcon', label: 'WhatsApp', href: 'https://wa.me/message/KZDYYZ7RE5BCK1' },
  { icon: 'imgLiIcon', label: 'LinkedIn', href: 'https://www.linkedin.com/company/blutone/' },
];
function Footer() {
  const navigate = useNavigate();
  const row = (items, mode) => {
    const cells = [];
    items.forEach((t, i) => {
      // vertical "khadi" divider between items (Figma: 12px tall, white @ 50%)
      if (i > 0) cells.push(<div key={'v' + i} style={{ width: 1, height: 12, background: C.white, opacity: 0.5, flexShrink: 0 }} />);
      cells.push(<span key={'t' + i} onClick={() => navigate(`/list?q=${encodeURIComponent(t)}`)} style={{ ...F.m500, fontSize: 14, color: C.white, whiteSpace: 'nowrap', cursor: 'pointer' }}>{t}</span>);
    });
    return (
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        // "between" rows spread via space-between; centre/left rows need an
        // explicit 13px gap so the divider isn't flush against the text (Figma).
        columnGap: mode === 'between' ? undefined : 13, rowGap: 12,
        justifyContent: mode === 'between' ? 'space-between' : mode === 'center' ? 'center' : 'flex-start',
        width: mode === 'center' ? 327 : '100%', padding: '0 20px', boxSizing: 'border-box',
      }}>{cells}</div>
    );
  };
  return (
    <div style={abs({ left: 0, top: 5287, width: 393 })}>
      {/* SHOP links */}
      <div style={{ position: 'relative', width: 393, height: 180, background: NAVY.n950, overflow: 'hidden' }}>
        <p style={abs({ left: 20, top: 20, ...F.m500, fontSize: 19, color: C.white })}>SHOP</p>
        <div style={abs({ left: 0, top: 56, width: 393, display: 'flex', flexDirection: 'column', gap: 12 })}>
          {row(SHOP_ROWS[0], 'between')}
          {row(SHOP_ROWS[1], 'center')}
          {row(SHOP_ROWS[2], 'between')}
          {row(SHOP_ROWS[3], 'start')}
        </div>
      </div>
      {/* logo + follow */}
      <div style={abs({ left: 20, top: 226, width: 352, display: 'flex', gap: 19, alignItems: 'flex-end' })}>
        <div style={{ width: 140, height: 89, flexShrink: 0 }}>
          <img src={asset('imgHdLogoPhotoroomTransparent2')} alt="Blutone" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ width: 193, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ ...F.m500, fontSize: 16, color: C.black }}>Follow us</p>
          <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label} style={{ width: 40, height: 40, borderRadius: 20, background: '#d0d7f2', padding: 8, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={asset(s.icon)} alt="" width={24} height={24} style={{ display: 'block' }} />
              </a>
            ))}
          </div>
        </div>
      </div>
      {/* contact */}
      <div style={abs({ left: 20, top: 375, width: 352, height: 2 })}><img src={asset('imgLine3')} alt="" style={{ width: '100%', height: '100%' }} /></div>
      <ContactUs style={abs({ left: 20, top: 406 })} />
      <div style={abs({ left: 20, top: 627, width: 352, height: 1, background: C.gray })} />
    </div>
  );
}

/* ---------- page ---------- */
export default function Home() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const accountLabel = isAuthenticated ? (user?.name?.trim().split(' ')[0] || 'Account') : 'Log in';
  const onAccountClick = () => (isAuthenticated ? setConfirmLogout(true) : setLoginOpen(true));

  const { data: home, loading: homeLoading } = useAsync(getHome, [], {});
  const newArrivals = home?.newArrivals || [];
  const bestSellers = home?.bestSellers || [];
  // SHOP NOW / CTA destinations, matched to each section's featured category.
  const go = (to) => navigate(to);
  const LEGGINGS = '/list?group=leggings'; // Blutone Essentials + Active Living + Our Craft all showcase leggings

  return (
    <>
      <Frame height={5950} cropTop={56}>
        <div style={abs({ inset: 0, background: '#fff' })} />

        {/* header */}
        <Logo />
        <SearchBar />
        <LoginButton onClick={onAccountClick} label={accountLabel} authed={isAuthenticated} />
        <AnnouncementStrip />

        {/* hero banners (auto-alternate every 1s; each links to its own category) */}
        <div style={abs({ left: 0, top: 141, width: 393, height: 464 })}>
          <BannerCarousel width={393} height={464} interval={3000} onShop={go} />
        </div>

        <FeatureBadges />
        <ShopByCategory />
        <BlutoneEssentials onShop={() => navigate(productPath(BUNDLE_PRODUCT), { state: { product: BUNDLE_PRODUCT } })} />
        <StyleSpotlight />
        <FeatureCardsRow />
        <OurCraft onShop={() => go(LEGGINGS)} />

        {/* NEW ARRIVAL */}
        <SectionHeading text="NEW ARRIVAL" top={2748} />
        <ViewAll left={308} top={2751} onClick={() => navigate('/list')} />
        <Carousel left={20} top={2825} width={373} height={430}>
          {newArrivals.length
            ? newArrivals.map((p, i) => <ProductCard key={i} variant="na" product={p} onClick={() => navigate(productPath(p), { state: { product: p } })} />)
            : homeLoading
            ? Array.from({ length: 4 }).map((_, i) => <RailCardSkeleton key={'skel' + i} variant="na" />)
            : null}
        </Carousel>

        <StatsSection />

        {/* BEST SELLERS */}
        <SectionHeading text="BEST SELLERS" top={3656} font={F.cormorant600} color={C.slate} />
        <ViewAll left={308} top={3658} onClick={() => navigate('/list')} />
        <Carousel left={20} top={3724} width={371} height={458}>
          {bestSellers.length
            ? bestSellers.map((p, i) => <ProductCard key={i} variant="bs" product={p} onClick={() => navigate(productPath(p), { state: { product: p } })} />)
            : homeLoading
            ? Array.from({ length: 4 }).map((_, i) => <RailCardSkeleton key={'skel' + i} variant="bs" />)
            : null}
        </Carousel>

        {/* ORDER IN BULK */}
        <div style={abs({ left: 20, top: 4227, width: 353 })}>
          <BulkOrderForm width={312} />
        </div>

        <CustomerReviews />
        <Footer />
      </Frame>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <ConfirmModal
        open={confirmLogout}
        title="Log out?"
        message="Are you sure you want to log out?"
        confirmLabel="Yes"
        cancelLabel="No"
        destructive
        onConfirm={() => { setConfirmLogout(false); logout(); }}
        onClose={() => setConfirmLogout(false)}
      />
    </>
  );
}
  