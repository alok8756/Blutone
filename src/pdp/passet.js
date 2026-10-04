// Resolves Product-page Figma asset names to locally-bundled URLs.
// Kept separate from the Home assets because the PDP reuses generic names
// (imgIcon, imgBar1, ...) that would otherwise collide.
import manifest from '../assets/pdp/manifest.json';

const files = import.meta.glob('../assets/pdp/*.{png,jpg,jpeg,svg,gif,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export function passet(name) {
  const file = manifest[name];
  if (!file) {
    console.warn('Unknown PDP asset:', name);
    return '';
  }
  return files['../assets/pdp/' + file];
}
