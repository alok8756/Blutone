import fs from 'node:fs';
const PORT = process.env.PORT || '5174';
const CDP = process.env.CDP || '9227';
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
const shot = async (name, h = 900) => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 393, height: h, scale: 1 } }); fs.writeFileSync(`shots/${name}.png`, Buffer.from(r.data, 'base64')); console.log('wrote shots/' + name); };

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 850, deviceScaleFactor: 2, mobile: false });
await send('Page.navigate', { url: `http://localhost:${PORT}/bag` });
await wait(2200);
await ev(`localStorage.setItem('bt_token', ${JSON.stringify(TOKEN)}); localStorage.setItem('blutone_cart_v1', JSON.stringify([{key:'golden-yellow-ankle-leggings||Golden Yellow||M', id:'golden-yellow-ankle-leggings', title:'Golden Yellow Ankle Leggings', img:'imgNwarPhoto1', color:'Golden Yellow', size:'M', price:350, mrp:499, qty:2}]));`);
await send('Page.navigate', { url: `http://localhost:${PORT}/checkout` });
await wait(2500);
console.log('checkout shows Pay?:', await ev(`!!([...document.querySelectorAll('button')].find(b=>/^Pay /.test(b.textContent||'')))`));
await shot('checkout', 950);

// click Pay (mock → instant success)
await ev(`[...document.querySelectorAll('button')].find(b=>/^Pay /.test(b.textContent||'')).click()`);
await wait(2500);
console.log('success shown?:', await ev(`document.body.innerText.includes('Payment successful')`));
console.log('cart cleared?:', await ev(`(JSON.parse(localStorage.getItem('blutone_cart_v1')||'[]')).length === 0`));
await shot('checkout_success', 950);
ws.close(); console.log('done');
