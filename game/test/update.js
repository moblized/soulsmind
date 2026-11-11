// Drives the in-game update card with a stand-in for the Android app's bridge.
const puppeteer = require('puppeteer-core'), path = require('path');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await page.setRequestInterception(true);
  page.on('request', (r) => (r.url().startsWith('file:') || r.url().startsWith('data:') ? r.continue() : r.abort()));
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.evaluateOnNewDocument(() => {
    window.__calls = [];
    window.RimebellApp = { buzz() {}, appVersion: () => '0.3.2', checkUpdate: () => window.__calls.push('check'), installUpdate: () => window.__calls.push('install'), openInstallSettings: () => window.__calls.push('settings') };
  });
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'app', 'index.html'), { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 400));
  const log = await page.evaluate(() => {
    const R = window.__rimebell, G = R.G, $ = (id) => document.getElementById(id), out = [];
    const ok = (n, c, x) => out.push((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : ''));
    const on = () => $('update').classList.contains('on'), vis = (id) => !$(id).hidden && getComputedStyle($(id)).display !== 'none';
    G.manual = true;
    R.appUpdate({ version: '0.3.4', current: '0.3.2' });
    ok('a found update shows on the title screen', on() && $('up-title').textContent === 'Souls Mind 0.3.4 is ready', $('up-text').textContent);
    $('btn-up-go').click(); ok('Update now asks the app to install', window.__calls.includes('install') && vis('up-bar') && !vis('btn-up-go'));
    R.updateProgress(45); ok('download progress shows', $('up-fill').style.width === '45%' && /45%/.test($('up-text').textContent));
    ok('Back cannot close it mid-download', R.back() === false || on());
    R.updateStatus({ kind: 'permission', text: 'Android needs your OK first.' });
    ok('a missing permission offers settings', $('btn-up-go').textContent === 'Open settings' && vis('btn-up-go'));
    $('btn-up-go').click(); ok('Open settings goes to Android settings', window.__calls.includes('settings'));
    R.wake(); ok('coming back offers Update now again', $('btn-up-go').textContent === 'Update now');
    R.updateStatus({ kind: 'error', text: 'Could not reach GitHub.' }); ok('an error offers Try again', $('btn-up-go').textContent === 'Try again');
    R.updateStatus({ kind: 'installing', text: 'Confirm the update in the Android prompt.' }); ok('installing hides the button', !vis('btn-up-go') && $('btn-up-later').textContent === 'Close');
    $('btn-up-later').click(); ok('Later closes the card', !on());
    // in play: a found update waits for the pause menu
    $('btn-new').click(); for (let i = 0; i < 30; i++) R.advance(1 / 60);
    R.appUpdate({ version: '0.3.5', current: '0.3.2' }); ok('during play the card waits', !on() && G.state === 'play');
    R.pause(); ok('it appears on pause', on() && $('up-title').textContent === 'Souls Mind 0.3.5 is ready');
    ok('pause shows the installed version', $('up-note').textContent === 'Version 0.3.2' && vis('btn-pupdate'));
    R.back(); ok('Back closes the card first', !on() && G.state === 'pause');
    R.resume(); R.pause(); ok('once dismissed it stays away this session', !on());
    $('btn-pupdate').click(); ok('Check for updates asks the app', window.__calls.includes('check') && /Checking/.test($('up-note').textContent));
    R.updateStatus({ kind: 'latest', text: 'You have the latest version (0.3.2).' }); ok('the answer shows in the pause menu', $('up-note').textContent === 'You have the latest version (0.3.2).' && !on());
    R.render(1 / 60);
    return out;
  });
  await page.screenshot({ path: path.join(__dirname, 'update.png') });
  const web = await browser.newPage(); await web.setRequestInterception(true); web.on('request', (r) => (r.url().startsWith('file:') ? r.continue() : r.abort()));
  await web.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'), { waitUntil: 'load' });
  const hidden = await web.evaluate(() => { window.__rimebell.G.manual = true; document.getElementById('btn-new').click(); window.__rimebell.pause(); return ['btn-pupdate', 'up-note', 'btn-pvib'].every((id) => getComputedStyle(document.getElementById(id)).display === 'none' || document.getElementById(id).offsetParent === null); });
  log.push((hidden ? 'ok   ' : 'FAIL ') + 'the browser version hides the app-only controls');
  console.log(log.join('\n') + '\n' + (errors.length ? 'ERRORS ' + errors.join('; ') : 'no page errors'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
