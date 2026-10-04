import fs from 'node:fs';

const PORT = process.env.PORT || '5174';
const targets = await (await fetch('http://localhost:9222/json')).json();
const page = targets.find((t) => t.type === 'page') || targets[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);

let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((res) => { const m = ++id; pending.set(m, res); ws.send(JSON.stringify({ id: m, method, params })); });
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
});
await new Promise((r) => ws.addEventListener('open', r));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 2, mobile: false });
await send('Page.navigate', { url: `http://localhost:${PORT}/` });
await wait(4000);

// Click the "Log in" button in the header.
const click = await send('Runtime.evaluate', {
  expression: `(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(x => /log in/i.test(x.textContent || ''));
    if (!b) return 'no-login-button';
    b.click();
    return 'clicked';
  })()`,
  returnByValue: true,
});
console.log('login click:', click.result.value);
await wait(900);

const shot1 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 393, height: 852, scale: 2 } });
fs.writeFileSync('shots/modal_phone.png', Buffer.from(shot1.data, 'base64'));
console.log('wrote shots/modal_phone.png');

// Type a phone number and submit to reach the OTP step (mock backend accepts it).
const typed = await send('Runtime.evaluate', {
  expression: `(() => {
    const input = document.querySelector('input[type="tel"]');
    if (!input) return 'no-input';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '9071364092');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return 'typed';
  })()`,
  returnByValue: true,
});
console.log('type phone:', typed.result.value);
await wait(400);

const submitted = await send('Runtime.evaluate', {
  expression: `(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(x => /send otp/i.test(x.textContent || ''));
    if (!b) return 'no-send-button';
    b.click();
    return 'submitted';
  })()`,
  returnByValue: true,
});
console.log('send otp:', submitted.result.value);
await wait(1500);

const shot2 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 393, height: 852, scale: 2 } });
fs.writeFileSync('shots/modal_otp.png', Buffer.from(shot2.data, 'base64'));
console.log('wrote shots/modal_otp.png');

ws.close();
console.log('done');
