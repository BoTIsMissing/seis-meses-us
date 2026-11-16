const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = path.join(__dirname, 'artifacts');
fs.mkdirSync(output, { recursive: true });
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-pipe', '--user-data-dir=' + path.join(output, 'browser-profile'), 'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'], windowsHide: true });
let counter = 0, buffer = '', session;
const pending = new Map(), errors = [];
browser.stdio[4].on('data', data => {
  buffer += data.toString();
  let end;
  while ((end = buffer.indexOf('\0')) >= 0) {
    const raw = buffer.slice(0, end); buffer = buffer.slice(end + 1);
    if (!raw) continue;
    const message = JSON.parse(raw);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, timer } = pending.get(message.id);
      clearTimeout(timer); pending.delete(message.id);
      message.error ? reject(Error(JSON.stringify(message.error))) : resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  }
});
browser.on('error', e => { console.error(e.message); process.exitCode = 1; });
function command(method, params = {}, useSession = true) {
  return new Promise((resolve, reject) => {
    const id = ++counter;
    const timer = setTimeout(() => { pending.delete(id); reject(Error('Timeout: ' + method)); }, 15000);
    pending.set(id, { resolve, reject, timer });
    browser.stdio[3].write(JSON.stringify({ id, method, params, ...(useSession && session ? { sessionId: session } : {}) }) + '\0');
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function screenshot(name) {
  const { data } = await command('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(output, name + '.png'), Buffer.from(data, 'base64'));
}
(async () => {
  try {
    const { targetId } = await command('Target.createTarget', { url: 'about:blank' }, false);
    session = (await command('Target.attachToTarget', { targetId, flatten: true }, false)).sessionId;
    await command('Page.enable'); await command('Runtime.enable');
    for (const width of [320, 390, 768, 1440]) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await command('Page.navigate', { url: pathToFileURL(path.join(root, 'index.html')).href });
      for (let i = 0; i < 30; i++) {
        if (await evaluate("document.querySelectorAll('#photo-grid .album-photo').length === 37 && !!document.querySelector('.quiz-option')")) break;
        await delay(150);
      }
      await delay(1000);
      const layout = await evaluate(`({width:innerWidth, scroll:document.documentElement.scrollWidth, photos:document.querySelectorAll('#photo-grid .album-photo').length, broken:[...document.images].filter(i=>i.complete && !i.naturalWidth && i.getAttribute('src')).map(i=>i.src), overflow:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width && (r.right>innerWidth+1 || r.left< -1)}).map(e=>e.className).slice(0,8)})`);
      assert(layout.scroll <= width + 1, JSON.stringify(layout));
      assert.equal(layout.photos, 37); assert.deepEqual(layout.broken, []);
      await screenshot('design-' + width);
      await evaluate("document.querySelector('#match-start').click(); document.querySelector('#jogos').scrollIntoView({behavior:'instant',block:'start'})");
      await delay(250);
      const cards = await evaluate("[...document.querySelectorAll('.match-card')].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))");
      assert.equal(cards.length, 12); assert(cards.every(c=>c.width>=44 && c.height>=44));
      if (width === 390) await screenshot('games-mobile');
      await evaluate("document.querySelector('.quiz-option').click()");
      assert(await evaluate("!document.querySelector('#quiz-next').hidden"));
      await evaluate("document.querySelector('#open-letter').click()"); await delay(300);
      assert(await evaluate("document.querySelector('#letter-dialog').open && !!document.querySelector('#letter-text del') && !!document.querySelector('#letter-text strong')"));
      assert(await evaluate("document.querySelector('#letter-dialog').scrollWidth <= document.querySelector('#letter-dialog').clientWidth + 1"));
      if (width === 390) await screenshot('letter-mobile');
      await evaluate("document.querySelector('#close-letter').click(); document.querySelector('.photo-open').click()"); await delay(300);
      assert(await evaluate("document.querySelector('#photo-dialog').open"));
      assert(await evaluate("document.querySelector('#photo-dialog').scrollWidth <= document.querySelector('#photo-dialog').clientWidth + 1"));
      await evaluate("document.querySelector('#close-photo').click()");
      console.log('PASS ' + width + 'px: layout, 37 photos, touch targets, games, letter and photo viewer.');
    }
    assert.deepEqual(errors, []); console.log('PASS: no browser JavaScript exceptions.');
  } finally {
    try { await command('Browser.close', {}, false); } catch {}
    browser.kill();
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
