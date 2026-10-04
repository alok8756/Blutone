import { useEffect, useState } from 'react';
import { FILTER_TABS, emptyFilters } from '../catalog.js';

// Desktop "Product multiple filter" dialog — left category tabs + options + CLOSE/APPLY.
export default function DesktopFilterModal({ open, initial, onClose, onApply, colorOptions = [], counts = {} }) {
  const [tab, setTab] = useState('color');
  const [draft, setDraft] = useState(emptyFilters());

  useEffect(() => {
    if (open) {
      setDraft(initial ? JSON.parse(JSON.stringify(initial)) : emptyFilters());
      setTab('color');
    }
  }, [open, initial]);

  if (!open) return null;

  const activeTab = FILTER_TABS.find((t) => t.key === tab);
  // Colour swatches come from the API; other tabs use their static options.
  const options = activeTab.kind === 'color' ? colorOptions : activeTab.options;
  const toggle = (key, id) => setDraft((d) => {
    const arr = d[key];
    return { ...d, [key]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id] };
  });
  const isOn = (key, id) => draft[key].includes(id);

  return (
    <div className="dtc-overlay" onClick={onClose}>
      <div className="dtf-panel" onClick={(e) => e.stopPropagation()}>
        <h3 className="dtc-title">FILTERS</h3>
        <div className="dtf-body">
          <div className="dtf-tabs">
            {FILTER_TABS.map((t) => {
              const n = draft[t.key].length;
              return (
                <button key={t.key} className={'dtf-tab' + (t.key === tab ? ' active' : '')} onClick={() => setTab(t.key)}>
                  {t.label}{n > 0 && <span className="dtf-badge">{n}</span>}
                </button>
              );
            })}
          </div>
          <div className="dtf-options">
            {activeTab.kind === 'color' ? (
              <div className="dtf-colors">
                {options.length === 0 && <span className="dtf-empty">No colours available.</span>}
                {options.map((o) => (
                  <button key={o.id} title={o.name} onClick={() => toggle('color', o.id)}
                    className={'dtf-color' + (isOn('color', o.id) ? ' on' : '')} style={{ background: o.hex }} />
                ))}
              </div>
            ) : (
              <div className="dtf-chips">
                {options.map((o) => {
                  // fabric/length carry per-scope counts (e.g. "Cotton (14)"); size chips don't.
                  const count = counts[activeTab.key]?.[o.id];
                  return (
                    <button key={o.id} onClick={() => toggle(activeTab.key, o.id)}
                      className={'dtf-chip' + (isOn(activeTab.key, o.id) ? ' on' : '')}>
                      {o.label}{count != null && <span className="dtf-chip-count"> ({count})</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="dtf-bar">
          <button className="dtf-close" onClick={onClose}>CLOSE</button>
          <button className="dtf-apply" onClick={() => onApply(draft)}>APPLY</button>
        </div>
      </div>
    </div>
  );
}
