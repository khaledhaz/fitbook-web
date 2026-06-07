const { chromium } = require('playwright');
const BASE = 'https://khaledhaz.github.io/fitbook-web/#';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = [], neterr = [];
  page.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,160)); });
  page.on('pageerror', e => errs.push('PAGEERR: '+String(e).slice(0,160)));
  page.on('response', r => { if (r.url().includes('supabase') && r.status()>=400) neterr.push(r.status()+' '+r.url().split('?')[0].slice(-50)); });
  // sign in
  await page.goto(BASE+'/signin', {waitUntil:'networkidle'});
  await page.fill('input[type=email],input', 'saqr@gmail.com');
  await page.fill('input[type=password]', 'saqr1111');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(4000);
  const afterLogin = page.url();
  const routes = ['/home','/schedule','/progress','/meals','/supplements','/body-measurements','/units','/connections','/chats','/profile'];
  const results = [];
  for (const r of routes) {
    await page.goto(BASE+r, {waitUntil:'networkidle'}).catch(()=>{});
    await page.waitForTimeout(1500);
    let overflow = {};
    for (const w of [375,1280]) { await page.setViewportSize({width:w,height:900}); await page.waitForTimeout(150); overflow[w] = await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth); }
    await page.setViewportSize({width:1280,height:900});
    results.push({r, ok: overflow[375]&&overflow[1280], overflow});
  }
  // progress names check
  await page.goto(BASE+'/progress', {waitUntil:'networkidle'}); await page.waitForTimeout(2500);
  const btns = await page.$$eval('button', bs=>bs.map(b=>b.textContent.trim()));
  const uuidLabels = btns.filter(t=>/^[0-9a-f]{8}-[0-9a-f]{4}/.test(t)).length;
  const ticks = await page.$$eval('.recharts-xAxis text', ts=>ts.map(t=>t.textContent));
  const invalidDates = ticks.filter(t=>/invalid/i.test(t)).length;
  console.log(JSON.stringify({afterLogin, routesAllOk: results.every(x=>x.ok), badRoutes: results.filter(x=>!x.ok), consoleErrors: [...new Set(errs)].slice(0,8), supabase4xx: [...new Set(neterr)].slice(0,8), uuidLabels, invalidDates}, null, 2));
  await browser.close();
})().catch(e=>{console.error('FATAL',e); process.exit(1)});
