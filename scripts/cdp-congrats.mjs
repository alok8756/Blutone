import fs from 'node:fs';

const PORT = process.env.PORT || '5174';
const CDP = process.env.CDP || '9224';
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
await send('Page.navigate', { url: `http://localhost:${PORT}/` });
await wait(2500);
await evalJs(`localStorage.removeItem('bt_token')`);
await send('Page.reload', {});
await wait(3000);

// open login
console.log('login:', await evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(x=>/log in/i.test(x.textContent||'')); if(!b) return 'no'; b.click(); return 'ok'; })()`));
await wait(800);

// type phone + send
await evalJs(`(() => { const i=document.querySelector('input[type=tel]'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,'9071364092'); i.dispatchEvent(new Event('input',{bubbles:true})); return 'typed'; })()`);
await wait(300);
console.log('send:', await evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(x=>/send otp/i.test(x.textContent||'')); if(!b) return 'no'; b.click(); return 'ok'; })()`));
await wait(1800);

// fill the 4 otp boxes with 1234 (mock code) and verify
await evalJs(`(() => {
  const ins=[...document.querySelectorAll('input[type=tel]')];
  const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
  '1234'.split('').forEach((d,k)=>{ if(ins[k]){ s.call(ins[k],d); ins[k].dispatchEvent(new Event('input',{bubbles:true})); } });
  return ins.length;
})()`);
await wait(400);
console.log('verify:', await evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(x=>/^verify$/i.test((x.textContent||'').trim())); if(!b) return 'no'; b.click(); return 'ok'; })()`));
await wait(1800);

const congrats = await evalJs(`document.body.innerText.includes('Congratulations')`);
console.log('congrats modal shown:', congrats);
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 393, height: 852, scale: 2 } });
fs.writeFileSync('shots/congrats.png', Buffer.from(shot.data, 'base64'));
console.log('wrote shots/congrats.png');

// outside-click closes it
await evalJs(`(() => { const sc=document.elementFromPoint(10,10); return 'corner'; })()`);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 8, y: 8, button: 'left', clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 8, y: 8, button: 'left', clickCount: 1 });
await wait(800);
console.log('after outside click, congrats still shown:', await evalJs(`document.body.innerText.includes('Congratulations')`));
console.log('logged in (login button now shows account/name?):', await evalJs(`!!localStorage.getItem('bt_token')`));

ws.close();
console.log('done');
