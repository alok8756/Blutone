import { useEffect } from 'react';
import { C, F } from '../tokens.js';
import { SORT_OPTIONS } from '../catalog.js';

// Sort bottom sheet — three sort types. Selecting one applies and closes.
export default function SortModal({ open, value, onClose, onApply, maxWidth = 500 }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 210 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', maxWidth, margin: '0 auto', background: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, boxShadow: '0px -4px 16px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 8px' }}>
          <p style={{ ...F.m600, fontSize: 18, color: C.slate }}>Sort By</p>
          <button onClick={onClose} aria-label="Close" style={{ ...F.m500, fontSize: 22, color: C.gray, border: 'none', background: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
        </div>
        {SORT_OPTIONS.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              onClick={() => onApply(o.id)}
              style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px' }}
            >
              <span style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${on ? C.pink : '#c4c4c4'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {on && <span style={{ width: 10, height: 10, borderRadius: 5, background: C.pink }} />}
              </span>
              <span style={{ ...F.m500, fontSize: 17, color: on ? C.slate : C.black }}>{o.label}</span>
            </button>
          );
        })}
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}
