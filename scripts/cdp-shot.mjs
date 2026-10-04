import fs from 'node:fs';

const targets = await (await fetch('http://localhost:9222/json')).json();
const page = targets.find((t) => t.type === 'page' && t.url.includes('localhost:5173')) || targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);

let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((res) => {
    const m = ++id;
    pending.set(m, res);
    ws.send(JSON.stringify({ id: m, method, params }));
  });

ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  }
});

await new Promise((r) => ws.addEventListener('open', r));

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 393, height: 900, deviceScaleFactor: 2, mobile: false,
});
await send('Page.navigate', { url: 'http://localhost:5173/' });
await new Promise((r) => setTimeout(r, 6000)); // let images load

const TOTAL = 4319;
const SLICE = 900;
const slices = [];
for (let y = 0; y < TOTAL; y += SLICE) {
  slices.push([y, Math.min(SLICE, TOTAL - y)]);
}

let i = 0;
for (const [y, h] of slices) {
  const { data } = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y, width: 393, height: h, scale: 2 },
  });
  const f = `shots/slice_${i}.png`;
  fs.writeFileSync(f, Buffer.from(data, 'base64'));
  console.log('wrote', f, `(y=${y} h=${h})`);
  i++;
}

ws.close();
console.log('done');
