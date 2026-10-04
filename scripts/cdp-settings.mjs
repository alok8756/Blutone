import fs from 'node:fs';
const PORT = process.env.PORT || '5174';
const CDP = process.env.CDP || '9230';
const TOKEN = fs.readFileSync(process.env.TOKEN_FILE, 'utf8').trim();
const targets = await (await fetch(`http://localhost:${CDP}/json`)).json();
const page = targets.find((t) => t.type === 'page') || targets[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (m, p = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
let patchCount = 0;
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Network.requestWillBeSent') {
    const r = m.params.request;
    if (r.method === 'PATCH' && /\/auth\/me/.test(r.url)) patchCount++;
  }
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
});
await new Promise((r) => ws.addEventListener('open', r));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true })).result.value;
const btn = (re) => `[...document.querySelectorAll('button')].find(b=>/${re}/i.test((b.textContent||'').trim()))`;

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 850, deviceScaleFactor: 2, mobile: false });
await send('Page.navigate', { url: `http://localhost:${PORT}/` }); await wait(1800);
await ev(`localStorage.setItem('bt_token', ${JSON.stringify(TOKEN)})`);
await send('Page.navigate', { url: `http://localhost:${PORT}/account?tab=settings` }); await wait(3000);

console.log('1) UPDATE disabled before Edit:', await ev(`${btn('^UPDATE$')}?.disabled`));
console.log('   Name input readOnly before Edit:', await ev(`document.querySelector('input[placeholder=\"Enter your name\"]')?.readOnly`));

// click Edit
await ev(`${btn('^Edit$')}?.click()`); await wait(500);
console.log('2) after Edit -> UPDATE enabled:', await ev(`${btn('^UPDATE$')}?.disabled === false`));
console.log('   Name editable:', await ev(`document.querySelector('input[placeholder=\"Enter your name\"]')?.readOnly === false`));

// change name
await ev(`(()=>{const i=document.querySelector('input[placeholder="Enter your name"]');const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i,'Vikram Singh');i.dispatchEvent(new Event('input',{bubbles:true}));return i.value;})()`);
await wait(300);

// rapid-click UPDATE 4x
await ev(`(()=>{const b=${btn('^UPDATE$')}||${btn('Saving')};for(let k=0;k<4;k++)b&&b.click();return true;})()`);
await wait(2500);
console.log('3) PATCH /auth/me calls after 4 rapid clicks:', patchCount, '(expect 1)');
console.log('4) after save -> UPDATE disabled again:', await ev(`${btn('^UPDATE$')}?.disabled`));
console.log('   Edit button label back to "Edit":', await ev(`!!${btn('^Edit$')}`));
console.log('   Name input shows saved value + readOnly:', await ev(`(()=>{const i=document.querySelector('input[placeholder="Enter your name"]')||document.querySelector('input[value="Vikram Singh"]');return null;})(); document.body.innerText.includes('Vikram Singh') || (document.querySelector('input')&&[...document.querySelectorAll('input')].some(i=>i.value==='Vikram Singh'))`));

ws.close(); console.log('done');
