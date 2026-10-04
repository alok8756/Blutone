import { useEffect, useState } from 'react';
import { C, F } from '../tokens.js';
import { FILTER_TABS, emptyFilters } from '../catalog.js';

// "Product multiple filter" modal (Figma 525:7031): left category tabs +
// per-tab options + CLOSE / APPLY bar. Color + Price constrain the catalog.
export default function FilterModal({ open, initial, onClose, onApply, colorOptions = [], counts = {}, maxWidth = 500 }) {
  const [tab, setTab] = useState('color');
  const [draft, setDraft] = useState(emptyFilters());

  useEffect(() => {
    if (open) {
      setDraft(initial ? JSON.parse(JSON.stringify(initial)) : emptyFilters());
      setTab('color');
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const activeTab = FILTER_TABS.find((t) => t.key === tab);
  // Colour swatches come from the API (buildColorOptions); other tabs use their
  // static options declared in FILTER_TABS.
  const options = activeTab.kind === 'color' ? colorOptions : activeTab.options;
  const toggle = (key, id) => {
    setDraft((d) => {
      const arr = d[key];
      const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
      return { ...d, [key]: next };
    });
  };
  const isOn = (key, id) => draft[key].includes(id);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 210, display: 'flex' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth, margin: '0 auto', height: '100%', background: C.white, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <p style={{ ...F.m500, fontSize: 20, color: C.black, padding: '20px 22px 16px' }}>FILTERS</p>
        <div style={{ height: 0.5, background: '#e0e0e0', width: '100%' }} />

        {/* Body: tabs + options */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <div style={{ width: 146, flexShrink: 0, overflowY: 'auto' }}>
            {FILTER_TABS.map((t) => {
              const active = t.key === tab;
              const n = draft[t.key].length;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{ width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: active ? C.white : C.offwhite, padding: '24px 20px', ...F.m500, fontSize: 20, color: C.dark, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {t.label}
                  {n > 0 && <span style={{ ...F.m500, fontSize: 12, color: C.white, background: C.pink, borderRadius: 10, padding: '1px 7px' }}>{n}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 20px' }}>
            {activeTab.kind === 'color' ? (
              options.length === 0 ? (
                <p style={{ ...F.m400, fontSize: 15, color: C.gray }}>No colours available.</p>
              ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 40px)', gap: 24, justifyContent: 'start' }}>
                {options.map((o) => {
                  const on = isOn('color', o.id);
                  return (
                    <button
                      key={o.id}
                      onClick={() => toggle('color', o.id)}
                      title={o.name}
                      style={{ width: 40, height: 40, borderRadius: 20, background: o.hex, cursor: 'pointer', padding: 0, border: on ? `2px solid ${C.dark}` : '1px solid #e0e0e0', outline: on ? `2px solid ${C.dark}` : 'none', outlineOffset: 2 }}
                    />
                  );
                })}
              </div>
              )
            ) : (
              // Per-tab layout: Size = 3 chips per row (centered); Fabric & Length
              // = one full-width option per row. Selected options get a dark fill.
              <div
                style={
                  activeTab.key === 'size'
                    ? { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }
                    : { display: 'flex', flexDirection: 'column', gap: 14 }
                }
              >
                {options.map((o) => {
                  const on = isOn(activeTab.key, o.id);
                  const isSize = activeTab.key === 'size';
                  // fabric/length carry per-scope counts (e.g. "Cotton (14)"); size chips don't.
                  const count = counts[activeTab.key]?.[o.id];
                  return (
                    <button
                      key={o.id}
                      onClick={() => toggle(activeTab.key, o.id)}
                      style={{
                        ...F.m500,
                        fontSize: isSize ? 18 : 17,
                        cursor: 'pointer',
                        width: '100%',
                        padding: isSize ? '15px 0' : '17px 20px',
                        borderRadius: 8,
                        border: `1.5px solid ${on ? C.slate : '#e0e0e0'}`,
                        background: on ? C.slate : C.white,
                        color: on ? C.white : C.dark,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isSize ? 'center' : 'space-between',
                      }}
                    >
                      <span>{o.label}</span>
                      {count != null && (
                        <span style={{ color: on ? 'rgba(255,255,255,0.8)' : C.gray, marginLeft: 6 }}>({count})</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CLOSE / APPLY bar */}
        <div style={{ background: 'rgba(60,65,84,0.1)', height: 80, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px' }}>
          <button onClick={onClose} style={{ ...F.m500, fontSize: 20, color: C.black, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>CLOSE</button>
          <button onClick={() => onApply(draft)} style={{ ...F.m600, fontSize: 20, color: C.pink, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
