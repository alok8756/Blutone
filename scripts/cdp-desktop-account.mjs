import fs from 'node:fs';

const PORT = process.env.PORT || '5174';
const CDP = process.env.CDP || '9226';
const TOKEN = fs.readFileSync(process.env.TOKEN_FILE, 'utf8').trim();

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
const shot = async (name, h) => {
  const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1280, height: h, scale: 1 } });
  fs.writeFileSync(`shots/${name}.png`, Buffer.from(r.data, 'base64'));
  console.log('wrote shots/' + name + '.png');
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

await send('Page.navigate', { url: `http://localhost:${PORT}/` });
await wait(2000);
await evalJs(`localStorage.setItem('bt_token', ${JSON.stringify(TOKEN)})`);

// Settings
await send('Page.navigate', { url: `http://localhost:${PORT}/account?tab=settings` });
await wait(2800);
console.log('settings ok:', await evalJs(`document.body.innerText.includes('Your Account') && document.body.innerText.includes('Address')`));
await shot('dt_acc_settings', 900);

// Help
await send('Page.navigate', { url: `http://localhost:${PORT}/account?tab=help` });
await wait(2000);
console.log('help ok:', await evalJs(`document.body.innerText.includes('FAQ')`));
await shot('dt_acc_help', 900);

// Wishlist (ensure an item: click PDP heart if empty)
await send('Page.navigate', { url: `http://localhost:${PORT}/product` });
await wait(3000);
const label = await evalJs(`(() => { const b=[...document.querySelectorAll('button[aria-label]')].find(x=>/wishlist/i.test(x.getAttribute('aria-label')||'')); return b?b.getAttribute('aria-label'):'none'; })()`);
if (label === 'Add to wishlist') { await evalJs(`[...document.querySelectorAll('button[aria-label]')].find(x=>/wishlist/i.test(x.getAttribute('aria-label')||'')).click()`); await wait(1200); }
console.log('pdp heart label:', label);
await send('Page.navigate', { url: `http://localhost:${PORT}/account?tab=wishlist` });
await wait(2500);
console.log('wishlist ok:', await evalJs(`document.body.innerText.includes('Wishlist')`));
await shot('dt_acc_wishlist', 900);

ws.close();
console.log('done');
