import { useEffect, useRef, useState } from 'react';
import { C, F } from '../tokens.js';

const DESIGN_W = 393;
const BAR_H = 74;
const NAV_H = 74;

function SortIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path d="M5 8h12M5 13h8M5 18h4" stroke={C.slate} strokeWidth="2" strokeLinecap="round" />
      <path d="M19 9V19M19 19l-3-3M19 19l3-3" stroke={C.slate} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function FilterIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path d="M4 8h18M4 18h18" stroke={C.slate} strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="8" r="3" fill="#fff" stroke={C.slate} strokeWidth="2" />
      <circle cx="16" cy="18" r="3" fill="#fff" stroke={C.slate} strokeWidth="2" />
    </svg>
  );
}

// Sticky Sort / Filter toolbar pinned just above the bottom nav (viewport-level,
// outside the scaled <Frame> so `fixed` actually pins). Scaled to match the frame.
export default function SortFilterBar({ onSort, onFilter, filterCount = 0, maxWidth = 500 }) {
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
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  const half = (icon, label, onClick, badge) => (
    <button onClick={onClick} style={{ flex: 1, height: '100%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, position: 'relative' }}>
      {icon}
      <span style={{ ...F.m500, fontSize: 18, color: C.slate, whiteSpace: 'nowrap' }}>{label}</span>
      {badge > 0 && <span style={{ ...F.m500, fontSize: 12, color: C.white, background: C.pink, borderRadius: 10, padding: '1px 7px' }}>{badge}</span>}
    </button>
  );

  return (
    <div
      ref={outerRef}
      style={{ position: 'fixed', left: 0, right: 0, width: '100%', maxWidth, margin: '0 auto', bottom: scale ? NAV_H * scale : NAV_H, height: scale ? BAR_H * scale : BAR_H, zIndex: 90 }}
    >
      <div
        style={{ width: DESIGN_W, height: BAR_H, position: 'absolute', top: 0, left: 0, transformOrigin: 'top left', transform: scale ? `scale(${scale})` : 'scale(1)', visibility: scale ? 'visible' : 'hidden', background: C.white, boxShadow: '0px -1px 10px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center' }}
      >
        {half(<SortIcon />, 'SORT BY', onSort, 0)}
        <div style={{ width: 0.5, height: 40, background: C.gray }} />
        {half(<FilterIcon />, 'FILTER', onFilter, filterCount)}
      </div>
    </div>
  );
}
