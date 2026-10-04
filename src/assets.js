// Resolves Figma asset constant names (e.g. "imgIcon4") to locally-bundled URLs.
import manifest from './assets/manifest.json';

const files = import.meta.glob('./assets/*.{png,jpg,jpeg,svg,gif,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export function asset(name) {
  // Product images now come from the DB as full Cloudinary URLs. When the value
  // is already an absolute URL (or a protocol-relative / data URI), return it
  // as-is so every render site keeps working without change. Only bundled
  // asset-KEY strings go through the manifest lookup below.
  if (typeof name === 'string' && /^(https?:)?\/\/|^data:/.test(name)) return name;
  const file = manifest[name];
  if (!file) {
    console.warn('Unknown asset:', name);
    return '';
  }
  return files['./assets/' + file];
}
