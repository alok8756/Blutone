import manifest from '../assets/manifest.json';

// Raw SVG source for every bundled asset, so we can inline + recolor it.
const RAW = import.meta.glob('../assets/*.svg', { query: '?raw', import: 'default', eager: true });

function rawSvg(name) {
  const file = manifest[name];
  if (!file) return '';
  return RAW['../assets/' + file] || '';
}

// Force every non-"none" fill/stroke (fixed colors AND var(--token, …) forms)
// to currentColor so the icon takes the wrapper's `color`. Preserves shape,
// works for both fill- and stroke-based (outline) icons.
function recolor(svg) {
  return svg.replace(/(fill|stroke)="(?!none")[^"]*"/g, '$1="currentColor"');
}

/**
 * Inline an SVG asset recolored to an EXACT color (via currentColor). Used for
 * the account tabs where the same icon must be #3c4154 on a light tab and white
 * on the active (dark) tab, and for the PDP wishlist heart (dark → pink).
 */
export default function MaskIcon({ name, size = 24, color = '#3c4154', style }) {
  const svg = recolor(rawSvg(name));
  return (
    <span
      aria-hidden
      style={{ display: 'inline-block', width: size, height: size, flexShrink: 0, color, lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
