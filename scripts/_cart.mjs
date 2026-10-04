import fs from 'node:fs';
const targets = await (await fetch('http://localhost:9222/json')).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (m, p = {}) => new Promise((res) => { const k = ++id; pending.set(k, res); ws.send(JSON.stringify({ id: k, method: m, params: p })); });
ws.addEventListener('message', (e) => { const msg = JSON.parse(e.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); } });
await new Promise((r) => ws.addEventListener('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 900, deviceScaleFactor: 2, mobile: false });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: '(()=>{' + expr + '})()', returnByValue: true })).result.value;

await send('Page.navigate', { url: 'http://localhost:5178/product' });
await new Promise((r) => setTimeout(r, 6500));
// clear any persisted cart for a clean run
await ev('localStorage.removeItem("blutone_cart_v1"); return 1');
await send('Page.navigate', { url: 'http://localhost:5178/product' });
await new Promise((r) => setTimeout(r, 4000));

// select colour index 4 (Rani Rose) + size L
await ev('document.querySelectorAll(\'button[aria-label^="#"]\')[4].click(); return 1');
await ev('[...document.querySelectorAll("button")].filter(b=>["S","M","L","XL","2X"].includes(b.textContent.trim())).find(b=>b.textContent.trim()==="L").click(); return 1');
await new Promise(r=>setTimeout(r,200));
// click ADD TO BAG
const clicked = await ev('const b=[...document.querySelectorAll("button")].find(b=>/ADD TO BAG/i.test(b.textContent)); if(b){b.click();return b.textContent.trim()} return "NOBTN"');
console.log('add button text:', clicked);
await new Promise(r=>setTimeout(r,300));
console.log('button after click:', await ev('return [...document.querySelectorAll("button")].find(b=>/ADD|BAG/i.test(b.textContent))?.textContent.trim()'));
console.log('cart localStorage:', await ev('return localStorage.getItem("blutone_cart_v1")'));

// go to bag
await send('Page.navigate', { url: 'http://localhost:5178/bag' });
await new Promise((r) => setTimeout(r, 4500));
console.log('bag has color line:', await ev('return [...document.querySelectorAll("p")].map(p=>p.textContent).filter(t=>/Color:|Size:/.test(t))'));
console.log('total amount text:', await ev('return [...document.querySelectorAll("p")].map(p=>p.textContent).find(t=>/Total Amount/.test(t)) || [...document.querySelectorAll("p")].filter(t=>/Rs /.test(t.textContent)).map(p=>p.textContent)'));
// increment qty
await ev('const incs=[...document.querySelectorAll("button[aria-label=Increase], button")].filter(b=>b.querySelector("img")); return 1');
// click the + (increase) qty button - find QtyBtn by the plus vector
const full = await ev('return document.documentElement.scrollHeight');
await send('Emulation.setDeviceMetricsOverride', { width: 393, height: full, deviceScaleFactor: 2, mobile: false });
await new Promise(r=>setTimeout(r,400));
const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 393, height: full, scale: 2 } });
fs.writeFileSync('shots/bag_mobile.png', Buffer.from(shot.data, 'base64'));
console.log('wrote shots/bag_mobile.png 393x' + full);
ws.close();
