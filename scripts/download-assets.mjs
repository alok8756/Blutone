import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'src', 'assets');
fs.mkdirSync(outDir, { recursive: true });

const assets = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets.json'), 'utf8'));

function extOf(buf, contentType) {
  const head = buf.subarray(0, 16);
  if (head[0] === 0x89 && head[1] === 0x50) return '.png';
  if (head[0] === 0xff && head[1] === 0xd8) return '.jpg';
  if (head[0] === 0x47 && head[1] === 0x49) return '.gif';
  if (head[0] === 0x52 && head[1] === 0x49) return '.webp';
  const txt = buf.subarray(0, 256).toString('utf8').trim().toLowerCase();
  if (txt.startsWith('<svg') || txt.startsWith('<?xml')) return '.svg';
  if (contentType?.includes('svg')) return '.svg';
  if (contentType?.includes('png')) return '.png';
  if (contentType?.includes('jpeg')) return '.jpg';
  return '.png';
}

const manifest = {};
let ok = 0, fail = 0;

for (const [name, url] of Object.entries(assets)) {
  const base = name.replace(/^img/, '');
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = extOf(buf, res.headers.get('content-type'));
    const file = base + ext;
    fs.writeFileSync(path.join(outDir, file), buf);
    manifest[name] = file;
    ok++;
    console.log('ok  ', file, buf.length + 'b');
  } catch (e) {
    fail++;
    console.log('FAIL', name, e.message);
  }
}

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\nDone: ${ok} ok, ${fail} failed. Manifest -> src/assets/manifest.json`);
