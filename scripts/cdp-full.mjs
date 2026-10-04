import fs from 'node:fs';

const [, , W, scaleArg, out] = process.argv;
const width = +W;
const scale = +scaleArg;

const targets = await (await fetch('http://localhost:9222/json')).json();
const page = targets.find((t) => t.type === 'page') ;
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (m, p = {}) => new Promise((res) => { const k = ++id; pending.set(k, res); ws.send(JSON.stringify({ id: k, method: m, params: p })); });
ws.addEventListener('message', (e) => { const msg = JSON.parse(e.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); } });
await new Promise((r) => ws.addEventListener('open', r));

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:5173/' });
await new Promise((r) => setTimeout(r, 6000));

const { result } = await send('Runtime.evaluate', { expression: 'document.documentElement.scrollHeight', returnByValue: true });
const height = result.value;

const { data } = await send('Page.captureScreenshot', {
  format: 'png', captureBeyondViewport: true,
  clip: { x: 0, y: 0, width, height, scale },
});
fs.writeFileSync(out, Buffer.from(data, 'base64'));
console.log('wrote', out, width + 'x' + height);
ws.close();
