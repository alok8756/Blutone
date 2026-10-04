import { useEffect, useRef, useState } from 'react';
import { C, F } from '../tokens.js';
import { getCategories } from '../api/client.js';
import { useAsync } from '../hooks/useApi.js';
import { Skeleton } from './Loaders.jsx';

const DESIGN_W = 393;
const SHEET_H = 541;

// "×" close button (Outline/Interface/Cross at 340.5,25.5 — 32x32 in Figma).
function Cross({ onClick }) {
  const bar = { position: 'absolute', left: '50%', top: '50%', width: 22, height: 1.5, background: C.slate, borderRadius: 1 };
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      style={{ position: 'absolute', left: 340.5, top: 25.5, width: 32, height: 32, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
    >
      <span style={{ ...bar, transform: 'translate(-50%, -50%) rotate(45deg)' }} />
      <span style={{ ...bar, transform: 'translate(-50%, -50%) rotate(-45deg)' }} />
    </button>
  );
}

// Category picker bottom sheet (Figma 218:4550). Scaled to match the frame.
export default function CategoryModal({ open, onClose, onSelect, maxWidth = 500 }) {
  const outerRef = useRef(null);
  const [scale, setScale] = useState(null);
  const { data: categories, loading } = useAsync(getCategories, [], []);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  // Lock background scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
      <div
        ref={outerRef}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', maxWidth, margin: '0 auto', height: scale ? SHEET_H * scale : SHEET_H }}
      >
        <div
          style={{
            width: DESIGN_W,
            height: SHEET_H,
            position: 'absolute',
            bottom: 0,
            left: 0,
            transformOrigin: 'bottom left',
            transform: scale ? `scale(${scale})` : 'scale(1)',
            visibility: scale ? 'visible' : 'hidden',
            background: C.white,
            border: `0.5px solid ${C.gray}`,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            boxShadow: '0px -4px 16px 0px rgba(0,0,0,0.25)',
            overflow: 'hidden',
          }}
        >
          <Cross onClick={onClose} />
          <div style={{ position: 'absolute', left: 43.5, top: 57.5, width: 213, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start' }}>
            {categories && categories.length
              ? categories.map((cat) => (
                  <p
                    key={cat.slug}
                    onClick={() => onSelect(cat)}
                    style={{ ...F.m500, fontSize: 20, color: C.slate, width: '100%', cursor: 'pointer' }}
                  >
                    {cat.label}
                  </p>
                ))
              : loading
              ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} w={150 + (i % 3) * 24} h={20} />)
              : null}
          </div>
        </div>
      </div>
    </div>
  );
}
