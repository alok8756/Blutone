import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { asset } from '../assets.js';
import Icon from '../components/Icon.jsx';
import LoginModal from '../components/LoginModal.jsx';
import { getSuggestions, getCategories } from '../api/client.js';
import { useAsync, useDebounced } from '../hooks/useApi.js';
import { useCart } from '../cart.jsx';
import { useAuth } from '../auth.jsx';

// Announcement message — same copy as the mobile home marquee (Home.jsx).
// Home only: this header is shared by every desktop page, so the marquee is
// gated on the route below rather than passed down as a prop from 9 pages.
const ANNOUNCE = 'Bundle pack at just Rs. 550 | Pan INDIA Delivery';

// Top-level desktop nav groups (Figma 1382:8553). All three reveal the same
// category mega-menu on hover; the categories inside route exactly like before.
const TOP_MENUS = [
  { key: 'women', label: 'Women' },
  { key: 'girls', label: 'Girls' },
  { key: 'kids', label: 'Kids' },
];

// Down-caret shown next to each top-level menu label (matches the Figma caret).
function Caret() {
  return (
    <svg className="dhh-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DesktopHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // The announcement marquee belongs to the home page only.
  const isHome = pathname === '/';
  const { count } = useCart();
  const { user, isAuthenticated } = useAuth();
  // Category nav — driven by the real catalogue like the mobile CategoryModal,
  // so every category is reachable and targets match (`/list?cat=<slug>`).
  const { data: categories } = useAsync(getCategories, [], []);
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  // Where to go once the login modal succeeds — both Wishlist and Login route
  // into /account, so the pending destination is remembered across the modal.
  const [afterLogin, setAfterLogin] = useState('/account');
  // Which top-level menu is open (hover-driven mega-menu). null = closed.
  const [openKey, setOpenKey] = useState(null);

  const accountLabel = isAuthenticated ? (user?.name?.trim().split(' ')[0] || 'Account') : 'Login';
  // Both actions need a session; when there isn't one, ask for it first and
  // continue to the same destination afterwards.
  const openGated = (to) => {
    if (isAuthenticated) return navigate(to);
    setAfterLogin(to);
    setLoginOpen(true);
  };
  const onAccount = () => openGated('/account');
  const onWishlist = () => openGated('/account?tab=wishlist');
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
      <div className="dhh-bar">
        <div className="dhh-bar-inner">
          {/* Figma 1382:8537 — the horizontal 335×60 lockup (not the stacked mark). */}
          <img className="dhh-logo" src={asset('imgHdLogoWide')} alt="Blutone" onClick={() => navigate('/')} />
          <div className="dhh-search-wrap">
            <div className="dhh-search">
              <Icon name="imgIcon10" size={25} inset={['14.26%', '13.25%', '13.25%', '14.26%']} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 120)}
                onKeyDown={(e) => { if (e.key === 'Enter') go(); }}
                placeholder="Search for Products"
                aria-label="Search your product"
              />
            </div>
            {suggestions.length > 0 && (
              <div className="dhh-suggest">
                {suggestions.map((s) => (
                  <p key={s} onMouseDown={(e) => { e.preventDefault(); go(s); }}>{s}</p>
                ))}
              </div>
            )}
          </div>
          {/* Figma 1382:8550 — Wishlist / Bag / Login, in that order. Each icon is
              40px in the 1728 frame (31px here) sitting directly on its label. */}
          <div className="dhh-actions">
            <button className="dhh-action wish" onClick={onWishlist} aria-label="Wishlist">
              {/* acHeart.svg IS Figma's "Outline/Status/Heart" (1655:8823) exported
                  as the full 28×28 box, so its padding is already baked in — it
                  fills the 31px icon square with no inset wrapper. */}
              <Icon name="imgAcHeart" size={31} />
              Wishlist
            </button>
            <button className="dhh-action bag" onClick={() => navigate('/bag')}>
              <Icon name="imgIcon6" size={31} inset={['11.46%', '12.91%', '10.42%', '5.21%']} />
              Bag
              {count > 0 && <span className="dhh-cartbadge">{count}</span>}
            </button>
            <button className="dhh-action acct" onClick={onAccount}>
              <Icon name={isAuthenticated ? 'imgIcon5' : 'imgIcon'} size={31} inset={isAuthenticated ? ['13.54%', '17.71%', '15.71%', '17.71%'] : ['17.71%', '17.71%', '17.71%', '13.54%']} />
              {accountLabel}
            </button>
          </div>
        </div>
      </div>
      <nav className="dhh-nav" onMouseLeave={() => setOpenKey(null)}>
        <div className="dhh-nav-inner">
          {TOP_MENUS.map((m) => (
            <button
              key={m.key}
              className={`dhh-navitem ${openKey === m.key ? 'on' : ''}`}
              onMouseEnter={() => setOpenKey(m.key)}
              onFocus={() => setOpenKey(m.key)}
              onClick={() => { setOpenKey(null); navigate('/list'); }}
              aria-haspopup="true"
              aria-expanded={openKey === m.key}
            >
              {m.label}
              <Caret />
            </button>
          ))}
        </div>
        {openKey && (
          <div className="dhh-mega">
            <div className="dhh-mega-panel">
              {(categories || []).map((c) => (
                <button
                  key={c.slug}
                  className="dhh-mega-item"
                  onClick={() => { setOpenKey(null); navigate(`/list?cat=${c.slug}`); }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>
      {isHome && (
        <div className="dhh-ann">
          <div className="bt-marquee">
            {[0, 1].map((g) => (
              <span key={g} className="dhh-ann-group" aria-hidden={g === 1}>
                {[0, 1, 2].map((i) => <span key={i}>{ANNOUNCE}</span>)}
              </span>
            ))}
          </div>
        </div>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onSuccess={() => navigate(afterLogin)} />
    </>
  );
}
