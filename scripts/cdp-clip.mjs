import fs from 'node:fs';

const [, , x, y, w, h, scale, out] = process.argv;
const targets = await (await fetch('http://localhost:9222/json')).json();
const page = targets.find((t) => t.type === 'page' && t.url.includes('localhost:5173')) || targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res) => { const m = ++id; pending.set(m, res); ws.send(JSON.stringify({ id: m, method, params })); });
ws.addEventListener('message', (e) => { const msg = JSON.parse(e.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); } });
await new Promise((r) => ws.addEventListener('open', r));
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 900, deviceScaleFactor: 2, mobile: false });
const { data } = await send('Page.captureScreenshot', {
  format: 'png', captureBeyondViewport: true,
  clip: { x: +x, y: +y, width: +w, height: +h, scale: +scale },
});
fs.writeFileSync(out, Buffer.from(data, 'base64'));
console.log('wrote', out);
ws.close();
