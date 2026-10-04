// Resolves Bag-page Figma asset names to locally-bundled URLs (namespaced).
import manifest from '../assets/bag/manifest.json';

const files = import.meta.glob('../assets/bag/*.{png,jpg,jpeg,svg,gif,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export function basset(name) {
  const file = manifest[name];
  if (!file) {
    console.warn('Unknown bag asset:', name);
    return '';
  }
  return files['../assets/bag/' + file];
}
