const targets = await (await fetch('http://localhost:9222/json')).json();
const page = targets.find((t) => t.type === 'page' && t.url.includes('localhost:5173')) || targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res) => { const m = ++id; pending.set(m, res); ws.send(JSON.stringify({ id: m, method, params })); });
ws.addEventListener('message', (e) => { const msg = JSON.parse(e.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); } });
await new Promise((r) => ws.addEventListener('open', r));

const expr = `
(() => {
  const out = [];
  // all imgs whose top is within the first BS rating row (y ~3240-3280)
  const imgs = [...document.querySelectorAll('img')];
  const near = imgs.map(i=>({i,r:i.getBoundingClientRect()})).filter(o=>o.r.y>3235 && o.r.y<3285 && o.r.x<260);
  out.push('imgs in rating row: '+near.length);
  near.slice(0,8).forEach((o,k)=>out.push(k+': '+JSON.stringify({w:Math.round(o.r.width),h:Math.round(o.r.height),x:Math.round(o.r.x),y:Math.round(o.r.y)})+' src='+o.i.src.slice(0,28)));
  // the CardStars wrapper: parent of those imgs (climb 2)
  if (near[0]) {
    let el = near[0].i.parentElement; const r1=el.getBoundingClientRect();
    out.push('imgWrap: '+JSON.stringify({w:Math.round(r1.width),h:Math.round(r1.height),pos:getComputedStyle(el).position}));
    el = el.parentElement; const r2=el.getBoundingClientRect();
    out.push('iconBox: '+JSON.stringify({w:Math.round(r2.width),h:Math.round(r2.height),pos:getComputedStyle(el).position}));
    el = el.parentElement; const r3=el.getBoundingClientRect();
    out.push('starsRow: '+JSON.stringify({w:Math.round(r3.width),h:Math.round(r3.height),disp:getComputedStyle(el).display,ai:getComputedStyle(el).alignItems}));
  }
  return out.join('\\n');
})()
`;
const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
console.log(res.result.value);
ws.close();
