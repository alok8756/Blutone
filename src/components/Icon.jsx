import { asset } from '../assets.js';

/**
 * Reproduces Figma's icon boxes: an outer square of `size`, the glyph image
 * inset by the exact percentages Figma used, optionally with a second
 * (negative) inset wrapper for stroked glyphs.
 *
 * inset / inner: [top, right, bottom, left] as CSS values (e.g. "10.41%").
 */
export default function Icon({ name, src, size, inset, inner, style, className }) {
  const i = inset || ['0', '0', '0', '0'];
  const url = src || asset(name);
  const img = (
    <img
      src={url}
      alt=""
      style={{
        position: 'absolute',
        inset: 0,
        display: 'block',
        width: '100%',
        height: '100%',
        maxWidth: 'none',
      }}
    />
  );
  return (
    <div
      className={className}
      style={{ position: 'relative', width: size, height: size, flexShrink: 0, ...style }}
    >
      <div style={{ position: 'absolute', top: i[0], right: i[1], bottom: i[2], left: i[3] }}>
        {inner ? (
          <div style={{ position: 'absolute', top: inner[0], right: inner[1], bottom: inner[2], left: inner[3] }}>
            {img}
          </div>
        ) : (
          img
        )}
      </div>
    </div>
  );
}
