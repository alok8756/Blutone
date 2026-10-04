import fs from 'node:fs';
const PORT = process.env.PORT || '5174';
const CDP = process.env.CDP || '9229';
const TOKEN = fs.readFileSync(process.env.TOKEN_FILE, 'utf8').trim();
const targets = await (await fetch(`http://localhost:${CDP}/json`)).json();
const page = targets.find((t) => t.type === 'page') || targets[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (m, p = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
await new Promise((r) => ws.addEventListener('open', r));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true })).result.value;
const shot = async (name, w, h) => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } }); fs.writeFileSync(`shots/${name}.png`, Buffer.from(r.data, 'base64')); console.log('wrote', name); };

await send('Page.enable'); await send('Runtime.enable');

// mobile: click first order card -> detail
await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 850, deviceScaleFactor: 2, mobile: false });
await send('Page.navigate', { url: `http://localhost:${PORT}/` }); await wait(1800);
await ev(`localStorage.setItem('bt_token', ${JSON.stringify(TOKEN)})`);
await send('Page.navigate', { url: `http://localhost:${PORT}/account?tab=orders` }); await wait(3500);
await ev(`[...document.querySelectorAll('[role=button]')].find(b=>/Order #/.test(b.textContent||''))?.click()`);
await wait(2500);
console.log('mobile detail?:', await ev(`document.body.innerText.includes('Back to orders') && document.body.innerText.includes('Delivery address')`));
await shot('orderdetail_mobile', 393, 1150);

// desktop: click first order card -> detail
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 950, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: `http://localhost:${PORT}/account?tab=orders` }); await wait(4000);
await ev(`[...document.querySelectorAll('.dta-order-btn')][0]?.click()`);
await wait(2500);
console.log('desktop detail?:', await ev(`document.body.innerText.includes('Back to orders') && document.querySelectorAll('.dta-detail').length>0`));
await shot('orderdetail_desktop', 1280, 950);
ws.close(); console.log('done');
