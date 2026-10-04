// Single source of truth for the product "Select Colors" swatch grid.
// Used by BOTH the mobile ProductPage and the desktop DesktopProduct so the
// selector looks and behaves identically everywhere (Figma node 190:1430).
//
// Figma lays out SWATCH_SLOTS (12) circles: the real colours (selectable) come
// first, the remaining slots are empty outlined placeholders awaiting API data.
import { SWATCH_SLOTS } from '../product.js';

// Figma "Iconsans/Bold/Tick" — a white rounded-square badge with the check
// knocked out, so the selected swatch colour shows through the checkmark.
function Tick() {
  return (
    <div style={{ position: 'absolute', inset: '20%', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: '12.5%' }}>
        <svg viewBox="0 0 18 18" fill="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0H4C2.93913 0 1.92172 0.421427 1.17157 1.17157C0.421427 1.92172 0 2.93913 0 4V14C0 15.0609 0.421427 16.0783 1.17157 16.8284C1.92172 17.5786 2.93913 18 4 18H14C15.0609 18 16.0783 17.5786 16.8284 16.8284C17.5786 16.0783 18 15.0609 18 14V4C18 2.93913 17.5786 1.92172 16.8284 1.17157C16.0783 0.421427 15.0609 0 14 0ZM13 7.13L8.19 11.93C8.1211 12.0006 8.03862 12.0565 7.94752 12.0943C7.85643 12.1321 7.75862 12.151 7.66 12.15C7.56146 12.1505 7.46382 12.1312 7.37281 12.0935C7.28179 12.0557 7.19924 12.0001 7.13 11.93L5 9.74C4.90861 9.59904 4.86719 9.43148 4.88238 9.26418C4.89756 9.09688 4.96848 8.93952 5.08376 8.81732C5.19904 8.69512 5.352 8.61517 5.51814 8.59027C5.68428 8.56537 5.85396 8.59697 6 8.68L7.66 10.34L12 6.07C12.0689 5.99924 12.1514 5.94301 12.2424 5.90461C12.3334 5.86621 12.4312 5.84643 12.53 5.84643C12.6288 5.84643 12.7266 5.86621 12.8176 5.90461C12.9086 5.94301 12.9911 5.99924 13.06 6.07C13.1258 6.1435 13.1764 6.22924 13.2089 6.32232C13.2415 6.4154 13.2554 6.51399 13.2498 6.61244C13.2443 6.7109 13.2193 6.80729 13.1765 6.8961C13.1336 6.98491 13.0736 7.06439 13 7.13Z" fill="#ffffff" />
        </svg>
      </div>
    </div>
  );
}

function ColorSwatch({ color, name, selected, size, onClick, onPrefetch }) {
  const r = size / 2;
  return (
    <button
      onClick={onClick}
      // Start loading that colour's product + photos on hover (desktop) or on
      // finger-down (mobile), so the gallery is ready by the time the tap lands.
      onPointerEnter={onPrefetch}
      onPointerDown={onPrefetch}
      onFocus={onPrefetch}
      aria-label={name || color}
      aria-pressed={selected}
      style={{ position: 'relative', width: size, height: size, padding: 0, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }}
    >
      <span style={{ position: 'absolute', inset: 0, borderRadius: r, background: color, border: '1px solid rgba(0,0,0,0.18)', boxSizing: 'border-box' }} />
      {selected && <Tick />}
    </button>
  );
}

// Empty outlined placeholder — Figma "SelectedColor / Ellipse 7" (white fill,
// 0.5px #000 stroke). Non-interactive: it has no colour assigned yet.
function EmptySwatch({ size }) {
  return (
    <div aria-hidden style={{ width: size, height: size, flexShrink: 0, borderRadius: size / 2, background: '#fff', border: '0.5px solid #000', boxSizing: 'border-box' }} />
  );
}

/**
 * Renders the swatch circles as a fragment so it drops into the parent's
 * existing flex-wrap container (mobile card / desktop block) unchanged.
 *
 * @param colors    [{ name, hex }] selectable colours (from product/API data)
 * @param selected  index of the selected colour
 * @param onSelect  (index) => void
 * @param size      circle diameter in px (mobile 40, desktop 44)
 * @param slots     total circle count incl. placeholders (default SWATCH_SLOTS)
 * @param onPrefetch (index) => void, optional — warm that colour before the tap
 */
export default function ColorSelector({ colors, selected, onSelect, size = 40, slots = SWATCH_SLOTS, onPrefetch }) {
  const placeholders = Math.max(0, slots - colors.length);
  return (
    <>
      {colors.map((c, i) => (
        <ColorSwatch key={c.name || i} color={c.hex} name={c.name} selected={i === selected} size={size} onClick={() => onSelect(i)} onPrefetch={onPrefetch ? () => onPrefetch(i) : undefined} />
      ))}
      {Array.from({ length: placeholders }).map((_, i) => (
        <EmptySwatch key={`empty-${i}`} size={size} />
      ))}
    </>
  );
}
