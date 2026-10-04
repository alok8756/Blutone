import fs from 'node:fs';

const PORT = process.env.PORT || '5174';
const CDP = process.env.CDP || '9223';
const targets = await (await fetch(`http://localhost:${CDP}/json`)).json();
const page = targets.find((t) => t.type === 'page') || targets[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (m, p = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
await new Promise((r) => ws.addEventListener('open', r));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const evalJs = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 2, mobile: false });

// 1) Open the bag, seed a logged-OUT cart on that origin, then reload so the
//    CartProvider reads it on mount.
await send('Page.navigate', { url: `http://localhost:${PORT}/bag` });
await wait(2500);
const seeded = await evalJs(`(() => {
  localStorage.removeItem('bt_token');
  localStorage.setItem('blutone_cart_v1', JSON.stringify([{
    key: 'demo||Royal Blue||M', id: 'demo', title: 'Ankle Length Leggings',
    img: 'imgNwarPhoto1', color: 'Royal Blue', size: 'M', price: 599, mrp: 999, qty: 1
  }]));
  return localStorage.getItem('blutone_cart_v1');
})()`);
console.log('seeded cart:', seeded);
await send('Page.reload', {});
await wait(3000);
const shotA = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 393, height: 852, scale: 2 } });
fs.writeFileSync('shots/gate_bag.png', Buffer.from(shotA.data, 'base64'));
console.log('wrote shots/gate_bag.png');

// 3) Click CHECKOUT -> login modal should appear (gated).
const clicked = await evalJs(`(() => {
  const els = [...document.querySelectorAll('*')].filter(e => (e.textContent||'').trim() === 'CHECKOUT');
  const bar = els.find(e => e.getAttribute('role') === 'button') || els[els.length-1];
  if (!bar) return 'no-checkout';
  (bar.closest('[role=button]') || bar).click();
  return 'clicked';
})()`);
console.log('checkout click:', clicked);
await wait(1000);
const modalShown = await evalJs(`!!([...document.querySelectorAll('button')].find(b => /send otp/i.test(b.textContent||'')))`);
console.log('login modal shown after checkout (logged out):', modalShown);
const shotB = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 393, height: 852, scale: 2 } });
fs.writeFileSync('shots/gate_modal.png', Buffer.from(shotB.data, 'base64'));
console.log('wrote shots/gate_modal.png');

// 4) Guard: direct visit to /checkout while logged out should bounce to /bag.
await send('Page.navigate', { url: `http://localhost:${PORT}/checkout` });
await wait(2500);
const path = await evalJs('location.pathname');
console.log('direct /checkout while logged out -> landed on:', path);

ws.close();
console.log('done');
