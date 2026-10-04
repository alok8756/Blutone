import fs from 'node:fs';

const PORT = process.env.PORT || '5174';
const CDP = process.env.CDP || '9225';
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
const shot = async (name, h = 1600) => {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 393, height: h, scale: 1 } });
  fs.writeFileSync(`shots/${name}.png`, Buffer.from(r.data, 'base64'));
  console.log('wrote shots/' + name + '.png');
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 900, deviceScaleFactor: 2, mobile: false });

// authenticate by injecting the token, and clear any prior wishlist via API
await send('Page.navigate', { url: `http://localhost:${PORT}/` });
await wait(2000);
await evalJs(`localStorage.setItem('bt_token', ${JSON.stringify(TOKEN)})`);

// 1) Account → Settings
await send('Page.navigate', { url: `http://localhost:${PORT}/account?tab=settings` });
await wait(3000);
console.log('settings shows name?:', await evalJs(`document.body.innerText.includes('YOUR ACCOUNT')`));
await shot('acc_settings', 1700);

// 2) Help tab
await send('Page.navigate', { url: `http://localhost:${PORT}/account?tab=help` });
await wait(2500);
console.log('help loaded?:', await evalJs(`document.body.innerText.includes('FAQ') || document.body.innerText.includes('Help')`));
await shot('acc_help', 1300);

// 3) PDP heart -> add to wishlist (already authed), screenshot pink heart
await send('Page.navigate', { url: `http://localhost:${PORT}/product` });
await wait(3500);
const beforeHeart = await evalJs(`(() => { const b=[...document.querySelectorAll('button[aria-label]')].find(x=>/wishlist/i.test(x.getAttribute('aria-label'))); return b?b.getAttribute('aria-label'):'no-heart'; })()`);
console.log('heart before:', beforeHeart);
await evalJs(`(() => { const b=[...document.querySelectorAll('button[aria-label]')].find(x=>/wishlist/i.test(x.getAttribute('aria-label'))); if(b) b.click(); return 'clicked'; })()`);
await wait(1500);
const afterHeart = await evalJs(`(() => { const b=[...document.querySelectorAll('button[aria-label]')].find(x=>/wishlist/i.test(x.getAttribute('aria-label'))); return b?b.getAttribute('aria-label'):'no-heart'; })()`);
console.log('heart after click:', afterHeart);
await shot('pdp_heart', 900);

// 4) Wishlist tab — should now contain the product
await send('Page.navigate', { url: `http://localhost:${PORT}/account?tab=wishlist` });
await wait(3000);
const wlCount = await evalJs(`document.querySelectorAll('img').length`);
console.log('wishlist ADD TO BAG present?:', await evalJs(`document.body.innerText.includes('ADD TO BAG')`));
await shot('acc_wishlist', 1300);

ws.close();
console.log('done');
