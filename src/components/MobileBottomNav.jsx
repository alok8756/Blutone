import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../cart.jsx';

// Bottom-nav icons come straight from Figma (node 895:9746 component set): each
// tab has an Outline (inactive, black) and a Solid (active, #FA0789 pink) glyph.
// The active tab renders the solid pink variant; the rest render the outline.
import navHomeOutline from '../assets/navHomeOutline.svg';
import navHomeSolid from '../assets/navHomeSolid.svg';
import navCatOutline from '../assets/navCatOutline.svg';
import navCatSolid from '../assets/navCatSolid.svg';
import navCartOutline from '../assets/navCartOutline.svg';
import navCartSolid from '../assets/navCartSolid.svg';
import navUserOutline from '../assets/navUserOutline.svg';
import navUserSolid from '../assets/navUserSolid.svg';

const DESIGN_W = 393;
const NAV_H = 74;
const ICON = 32;

const NavIcon = ({ outline, solid, active }) => (
  <img src={active ? solid : outline} alt="" width={ICON} height={ICON} style={{ display: 'block', width: ICON, height: ICON }} />
);

// Always-visible bottom navigation. Rendered at viewport level (NOT inside the
// scaled <Frame>) so `position: fixed` actually pins to the viewport — a fixed
// element inside a CSS `transform` ancestor would otherwise be trapped by it.
// We re-create the Frame's scale-to-fit so the bar lines up pixel-for-pixel.
export default function MobileBottomNav({ onCategory, categoryActive = false, maxWidth = 500 }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const outerRef = useRef(null);
  const [scale, setScale] = useState(null);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / DESIGN_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const { count } = useCart();
  const isHome = pathname === '/';
  const isCart = pathname === '/bag';
  const isAccount = pathname === '/account';
  const tap = { cursor: 'pointer', display: 'flex', position: 'relative' };
  const badge = count > 0 && (
    <span style={{ position: 'absolute', top: -6, right: -8, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: '#fa0789', color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
      {count}
    </span>
  );

  return (
    <div
      ref={outerRef}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        maxWidth,
        margin: '0 auto',
        height: scale ? NAV_H * scale : NAV_H,
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: DESIGN_W,
          height: NAV_H,
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: 'top left',
          transform: scale ? `scale(${scale})` : 'scale(1)',
          visibility: scale ? 'visible' : 'hidden',
          background: '#fefefe',
          boxShadow: '0px -1px 10px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Figma: px-[46px], icons vertically centred in the 74px bar. */}
        <div style={{ position: 'absolute', left: 0, top: (NAV_H - ICON) / 2, width: DESIGN_W, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 46px', boxSizing: 'border-box' }}>
          <span onClick={() => navigate('/')} style={tap} aria-label="Home">
            <NavIcon outline={navHomeOutline} solid={navHomeSolid} active={isHome} />
          </span>
          <span onClick={onCategory} style={tap} aria-label="Categories">
            <NavIcon outline={navCatOutline} solid={navCatSolid} active={categoryActive} />
          </span>
          <span onClick={() => navigate('/bag')} style={tap} aria-label="Bag">
            <NavIcon outline={navCartOutline} solid={navCartSolid} active={isCart} />
            {badge}
          </span>
          <span onClick={() => navigate('/account')} style={tap} aria-label="Account">
            <NavIcon outline={navUserOutline} solid={navUserSolid} active={isAccount} />
          </span>
        </div>
      </div>
    </div>
  );
}
