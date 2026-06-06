/**
 * FitBook Web — Detailed QA Pass 2
 * More targeted checks after first pass findings.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8871';
const EMAIL = 'saqr@gmail.com';
const PASSWORD = 'saqr1111';
const SCREENSHOTS_DIR = path.join(__dirname);

const issues = [];

async function signIn(page) {
  await page.goto(`${BASE}/#/signin`);
  await page.waitForTimeout(2000);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.toString().includes('/home'), { timeout: 15000 });
  await page.waitForTimeout(2000);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const allNetworkCalls = [];
  const jsErrors = [];

  page.on('response', async (resp) => {
    const url = resp.url();
    const status = resp.status();
    if (url.includes('supabase.co')) {
      let body = '';
      try { body = await resp.text(); body = body.substring(0, 400); } catch {}
      allNetworkCalls.push({ url: url.substring(0, 200), status, body: body.substring(0, 300) });
    }
  });

  page.on('pageerror', (err) => jsErrors.push(err.message.substring(0, 400)));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      jsErrors.push(`[console.error] ${msg.text().substring(0, 300)}`);
    }
  });

  // ─── Sign in ─────────────────────────────────────────────────────────────────
  console.log('Signing in...');
  await signIn(page);
  console.log('Signed in. Current URL:', page.url());

  const saqrUserId = '7bcec53b-f0c0-40c1-84e8-9c5af71c4bc3';
  const conversationId = '2c5e403e-0152-47f1-b721-b926c03ef7d1';

  // ─── TEST 1: Profile page — check for user data rendering ─────────────────────

  console.log('\n--- TEST: Profile page ---');
  allNetworkCalls.length = 0; jsErrors.length = 0;
  await page.goto(`${BASE}/#/profile`);
  await page.waitForTimeout(5000);
  const profileText = await page.evaluate(() => document.body.innerText);
  const profileNetFails = allNetworkCalls.filter(n => n.status >= 400);

  console.log('Profile page text snippet:', profileText.substring(0, 300));
  console.log('Profile network fails:', profileNetFails.length);
  profileNetFails.forEach(f => console.log('  FAIL:', f.status, f.url.substring(0, 100), f.body.substring(0, 100)));
  console.log('Profile JS errors:', jsErrors.length, jsErrors.slice(0, 2));

  // Check profile has the user's email or display name
  if (!profileText.includes('saqr') && !profileText.includes('Profile') && !profileText.includes('profile')) {
    issues.push({
      severity: 'MED',
      route_or_component: '/profile',
      symptom: 'Profile page does not show user-specific content',
      evidence: `Text: "${profileText.substring(0, 200)}"`,
      area: 'trainee'
    });
  }

  // ─── TEST 2: Vitals page — saqr already has vitals, should redirect or show form ─

  console.log('\n--- TEST: Vitals page ---');
  allNetworkCalls.length = 0; jsErrors.length = 0;
  await page.goto(`${BASE}/#/vitals`);
  await page.waitForTimeout(5000);
  const vitalsUrl = page.url();
  const vitalsText = await page.evaluate(() => document.body.innerText);

  console.log('Vitals URL after navigation:', vitalsUrl);
  console.log('Vitals text:', vitalsText.substring(0, 200));

  // Router sends trainee with vitals to /home from AuthResolver,
  // but RequireAuth(/vitals) does NOT have the RequireTrainee guard —
  // it just uses RequireAuth. So saqr CAN see the vitals form.
  // Confirm the page has content.
  if (!vitalsText || vitalsText.trim().length < 20) {
    issues.push({
      severity: 'HIGH',
      route_or_component: '/vitals',
      symptom: 'Vitals page blank for authenticated trainee who already has vitals',
      evidence: `URL: ${vitalsUrl}, text length: ${vitalsText.length}`,
      area: 'connections-onboarding'
    });
  }

  // ─── TEST 3: Check workout session with dayId + planId issue ──────────────────

  console.log('\n--- TEST: Workout session create (checking network payload) ---');

  // First get the workout plan id for saqr
  allNetworkCalls.length = 0; jsErrors.length = 0;
  await page.goto(`${BASE}/#/home`);
  await page.waitForTimeout(6000);

  const homeNetCalls = allNetworkCalls.filter(n => n.url.includes('workout_plans'));
  console.log('Workout plan network calls on home:', homeNetCalls.length);
  homeNetCalls.forEach(c => console.log('  ', c.status, c.url.substring(0, 120), c.body.substring(0, 100)));

  // Click Start Workout if present
  allNetworkCalls.length = 0; jsErrors.length = 0;
  const startBtn = page.locator('button:has-text("Start Workout")').first();
  if (await startBtn.count() > 0) {
    console.log('Found Start Workout button');
    await startBtn.click();
    await page.waitForTimeout(2000);

    const sessionPageUrl = page.url();
    console.log('Session URL:', sessionPageUrl);

    // Now click Start Session
    const startSessionBtn = page.locator('button:has-text("Start Session")').first();
    if (await startSessionBtn.count() > 0) {
      console.log('Clicking Start Session...');
      await startSessionBtn.click();
      await page.waitForTimeout(3000);

      const sessionNetFails = allNetworkCalls.filter(n => n.status >= 400);
      const sessionNet200 = allNetworkCalls.filter(n => n.status < 300);

      console.log('Session network calls:');
      allNetworkCalls.forEach(c => console.log(`  [${c.status}]`, c.url.substring(0, 120), '|', c.body.substring(0, 100)));

      if (sessionNetFails.length > 0) {
        sessionNetFails.forEach(f => {
          issues.push({
            severity: 'HIGH',
            route_or_component: '/workout/session',
            symptom: `workout_sessions INSERT fails: HTTP ${f.status} — missing workout_plan_id`,
            evidence: `${f.url.substring(0, 120)} — ${f.body.substring(0, 200)}`,
            area: 'trainee'
          });
        });
      }

      // Check if session started (timer visible)
      const afterText = await page.evaluate(() => document.body.innerText);
      const timerVisible = /\d+:\d+/.test(afterText);
      const completeVisible = afterText.includes('Complete Workout');
      console.log('Timer visible:', timerVisible, '| Complete Workout:', completeVisible);

      if (!timerVisible && !completeVisible) {
        issues.push({
          severity: 'HIGH',
          route_or_component: '/workout/session',
          symptom: 'Session fails to start — "Complete Workout" and timer not visible after clicking "Start Session"',
          evidence: `Network POST to workout_sessions returns 400 (null workout_plan_id not-null constraint). Text: "${afterText.substring(0, 200)}"`,
          area: 'trainee'
        });
      }

      // Screenshot the workout session (with or without started)
      await page.setViewportSize({ width: 375, height: 812 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'workout_session_375.png') });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'workout_session_1280.png') });
    }
  } else {
    console.log('No "Start Workout" button — rest day or no plan');
    issues.push({
      severity: 'LOW',
      route_or_component: '/home',
      symptom: 'No "Start Workout" button visible — could be rest day (not a bug if day_index doesn\'t match today)',
      evidence: 'Button not found',
      area: 'trainee'
    });
  }

  // ─── TEST 4: Body measurements page ──────────────────────────────────────────

  console.log('\n--- TEST: Body Measurements ---');
  allNetworkCalls.length = 0; jsErrors.length = 0;
  await page.goto(`${BASE}/#/body-measurements`);
  await page.waitForTimeout(5000);

  const bmText = await page.evaluate(() => document.body.innerText);
  const bmFails = allNetworkCalls.filter(n => n.status >= 400);
  console.log('Body measurements text:', bmText.substring(0, 300));
  console.log('Network fails:', bmFails.length);
  bmFails.forEach(f => console.log('  FAIL:', f.status, f.url.substring(0, 100), f.body.substring(0, 100)));

  if (bmFails.length > 0) {
    bmFails.forEach(f => issues.push({
      severity: 'HIGH',
      route_or_component: '/body-measurements',
      symptom: `Body measurements API call failed: HTTP ${f.status}`,
      evidence: `${f.url.substring(0, 120)} — ${f.body.substring(0, 200)}`,
      area: 'trainee'
    }));
  }

  // Take screenshots
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'body_measurements_375.png') });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'body_measurements_1280.png') });

  // ─── TEST 5: Progress page — exercise progress RPC ────────────────────────────

  console.log('\n--- TEST: Progress (RPC check) ---');
  allNetworkCalls.length = 0; jsErrors.length = 0;
  await page.goto(`${BASE}/#/progress`);
  await page.waitForTimeout(8000);

  const progressNetFails = allNetworkCalls.filter(n => n.status >= 400);
  const progressNet = allNetworkCalls.filter(n => n.url.includes('rpc'));

  console.log('Progress RPC calls:', progressNet.length);
  progressNet.forEach(c => console.log(`  [${c.status}]`, c.url.substring(0, 150), '|', c.body.substring(0, 100)));
  console.log('Progress network fails:', progressNetFails.length);
  progressNetFails.forEach(f => console.log('  FAIL:', f.status, f.url.substring(0, 100), f.body.substring(0, 100)));

  if (progressNetFails.length > 0) {
    progressNetFails.forEach(f => issues.push({
      severity: 'HIGH',
      route_or_component: '/progress',
      symptom: `Progress RPC failed: HTTP ${f.status}`,
      evidence: `${f.url.substring(0, 120)} — ${f.body.substring(0, 200)}`,
      area: 'trainee'
    }));
  }

  // Check for body weight and exercise chart rendering
  const progressText = await page.evaluate(() => document.body.innerText);
  console.log('Progress text:', progressText.substring(0, 300));

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'progress_375.png') });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'progress_1280.png') });

  // ─── TEST 6: Supplements — RPC call ───────────────────────────────────────────

  console.log('\n--- TEST: Supplements ---');
  allNetworkCalls.length = 0; jsErrors.length = 0;
  await page.goto(`${BASE}/#/supplements`);
  await page.waitForTimeout(6000);

  const suppFails = allNetworkCalls.filter(n => n.status >= 400);
  const suppRpc = allNetworkCalls.filter(n => n.url.includes('rpc') || n.url.includes('supplement'));

  console.log('Supplement network calls:', suppRpc.length);
  suppRpc.forEach(c => console.log(`  [${c.status}]`, c.url.substring(0, 150), '|', c.body.substring(0, 100)));

  if (suppFails.length > 0) {
    suppFails.forEach(f => issues.push({
      severity: 'HIGH',
      route_or_component: '/supplements',
      symptom: `Supplements API failed: HTTP ${f.status}`,
      evidence: `${f.url.substring(0, 120)} — ${f.body.substring(0, 200)}`,
      area: 'trainee'
    }));
  }

  // ─── TEST 7: Schedule page — tab content ──────────────────────────────────────

  console.log('\n--- TEST: Schedule tabs ---');
  allNetworkCalls.length = 0; jsErrors.length = 0;
  await page.goto(`${BASE}/#/schedule`);
  await page.waitForTimeout(6000);

  const scheduleFails = allNetworkCalls.filter(n => n.status >= 400);
  scheduleFails.forEach(f => {
    issues.push({
      severity: 'HIGH',
      route_or_component: '/schedule',
      symptom: `Schedule API failed: HTTP ${f.status}`,
      evidence: `${f.url.substring(0, 120)} — ${f.body.substring(0, 200)}`,
      area: 'trainee'
    });
  });

  // Try clicking Meals tab
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'schedule_workout_375.png') });

  const mealsTab = page.locator('[role="tab"]:has-text("Meals")').first();
  if (await mealsTab.count() > 0) {
    await mealsTab.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'schedule_meals_375.png') });

  const suppTab = page.locator('[role="tab"]:has-text("Supplements")').first();
  if (await suppTab.count() > 0) {
    await suppTab.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'schedule_supplements_375.png') });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'schedule_1280.png') });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'schedule_supplements_1280.png') });

  // ─── TEST 8: Chat message verification ───────────────────────────────────────

  console.log('\n--- TEST: Chat verification after send ---');
  allNetworkCalls.length = 0; jsErrors.length = 0;
  await page.goto(`${BASE}/#/chat/${conversationId}`);
  await page.waitForTimeout(5000);

  const chatFails = allNetworkCalls.filter(n => n.status >= 400);
  chatFails.forEach(f => {
    issues.push({
      severity: 'HIGH',
      route_or_component: `/chat/${conversationId}`,
      symptom: `Chat API failed on load: HTTP ${f.status}`,
      evidence: `${f.url.substring(0, 120)} — ${f.body.substring(0, 200)}`,
      area: 'chat'
    });
  });

  // Verify the QA message we sent earlier is persisted
  const chatText = await page.evaluate(() => document.body.innerText);
  console.log('Chat text (looking for QA test message):', chatText.includes('QA test message') ? 'FOUND' : 'NOT FOUND');

  if (!chatText.includes('QA test message')) {
    issues.push({
      severity: 'MED',
      route_or_component: `/chat/${conversationId}`,
      symptom: 'Previously sent test message not visible on chat re-load (persistence verification)',
      evidence: 'Text "QA test message" not in page after reload',
      area: 'chat'
    });
  }

  // Re-send to confirm send works in this session
  allNetworkCalls.length = 0; jsErrors.length = 0;
  const textarea = page.locator('textarea[aria-label="Message composer"]');
  if (await textarea.count() > 0) {
    await textarea.fill('QA verification message 2');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);

    const sendFails = allNetworkCalls.filter(n => n.status >= 400 && n.url.includes('messages'));
    sendFails.forEach(f => {
      issues.push({
        severity: 'HIGH',
        route_or_component: `/chat/${conversationId}`,
        symptom: `Message send failed: HTTP ${f.status}`,
        evidence: `${f.url.substring(0, 120)} — ${f.body.substring(0, 200)}`,
        area: 'chat'
      });
    });

    const afterSendText = await page.evaluate(() => document.body.innerText);
    if (!afterSendText.includes('QA verification message 2')) {
      issues.push({
        severity: 'HIGH',
        route_or_component: `/chat/${conversationId}`,
        symptom: 'Message send via Enter key did not render in chat',
        evidence: 'QA verification message 2 not in DOM',
        area: 'chat'
      });
    }
  }

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'chat_detail_375.png') });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'chat_detail_1280.png') });

  // ─── TEST 9: Connections page — search tab ────────────────────────────────────

  console.log('\n--- TEST: Connections search ---');
  allNetworkCalls.length = 0; jsErrors.length = 0;
  await page.goto(`${BASE}/#/connections`);
  await page.waitForTimeout(4000);

  // Click Find Trainer tab
  const findTab = page.locator('[role="tab"]:has-text("Find")').first();
  if (await findTab.count() > 0) {
    await findTab.click();
    await page.waitForTimeout(1000);

    // Search for a trainer
    const searchInput = page.locator('input[type="search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('trainer');
      const searchBtn = page.locator('button:has-text("Search")').first();
      await searchBtn.click();
      await page.waitForTimeout(3000);

      const searchFails = allNetworkCalls.filter(n => n.status >= 400);
      searchFails.forEach(f => {
        issues.push({
          severity: 'HIGH',
          route_or_component: '/connections',
          symptom: `Trainer search RPC failed: HTTP ${f.status}`,
          evidence: `${f.url.substring(0, 120)} — ${f.body.substring(0, 200)}`,
          area: 'connections-onboarding'
        });
      });

      const connText = await page.evaluate(() => document.body.innerText);
      console.log('Search results text:', connText.substring(0, 300));
    }
  }

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'connections_375.png') });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'connections_1280.png') });

  // ─── TEST 10: Profile view of saqr's own profile ─────────────────────────────

  console.log('\n--- TEST: Profile View (saqr own profile) ---');
  allNetworkCalls.length = 0; jsErrors.length = 0;
  await page.goto(`${BASE}/#/profile/view/${saqrUserId}`);
  await page.waitForTimeout(5000);

  const pvText = await page.evaluate(() => document.body.innerText);
  const pvFails = allNetworkCalls.filter(n => n.status >= 400);

  console.log('Profile view text:', pvText.substring(0, 300));
  pvFails.forEach(f => {
    issues.push({
      severity: 'HIGH',
      route_or_component: `/profile/view/${saqrUserId}`,
      symptom: `Profile view API failed: HTTP ${f.status}`,
      evidence: `${f.url.substring(0, 120)} — ${f.body.substring(0, 200)}`,
      area: 'connections-onboarding'
    });
  });

  // Check if user info renders
  if (!pvText.includes('saqr') && !pvText.includes('Profile') && !pvText.includes('Trainee')) {
    issues.push({
      severity: 'MED',
      route_or_component: `/profile/view/${saqrUserId}`,
      symptom: 'Profile view does not show any user data',
      evidence: `Text: "${pvText.substring(0, 200)}"`,
      area: 'connections-onboarding'
    });
  }

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'profile_view_375.png') });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'profile_view_1280.png') });

  // ─── TEST 11: Overflow check on key pages ─────────────────────────────────────

  console.log('\n--- TEST: Overflow checks ---');

  const overflowRoutes = [
    { route: '/home', label: 'home' },
    { route: '/schedule', label: 'schedule' },
    { route: '/meals', label: 'meals' },
    { route: '/progress', label: 'progress' },
    { route: `/chat/${conversationId}`, label: 'chat_detail' },
    { route: '/connections', label: 'connections' },
  ];

  for (const { route, label } of overflowRoutes) {
    await page.goto(`${BASE}/#${route}`);
    await page.waitForTimeout(4000);

    for (const w of [375, 768, 1280]) {
      await page.setViewportSize({ width: w, height: 812 });
      await page.waitForTimeout(300);
      const { scrollW, innerW } = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
      }));
      if (scrollW > innerW) {
        const overflow = scrollW - innerW;
        console.log(`  OVERFLOW on ${label} at ${w}px: +${overflow}px`);
        issues.push({
          severity: overflow > 20 ? 'MED' : 'LOW',
          route_or_component: route,
          symptom: `Horizontal overflow at ${w}px viewport`,
          evidence: `scrollWidth=${scrollW}, innerWidth=${innerW}, overflow=+${overflow}px`,
          area: label.includes('chat') ? 'chat' : label === 'connections' ? 'connections-onboarding' : 'trainee'
        });
      } else {
        console.log(`  OK: ${label} at ${w}px (scrollW=${scrollW}, innerW=${innerW})`);
      }
    }
    await page.setViewportSize({ width: 1280, height: 800 });
  }

  // ─── TEST 12: 768px sidebar vs bottom nav ─────────────────────────────────────

  console.log('\n--- TEST: Responsive nav at 768px ---');
  await page.goto(`${BASE}/#/home`);
  await page.waitForTimeout(3000);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'home_768.png') });

  // Check nav presence
  const navAt768 = await page.locator('nav').count();
  console.log('Nav elements at 768px:', navAt768);
  await page.setViewportSize({ width: 1280, height: 800 });

  // ─── Close browser ───────────────────────────────────────────────────────────

  await browser.close();

  console.log('\n\n=== ADDITIONAL ISSUES FROM DETAILED QA ===\n');
  console.log(JSON.stringify(issues, null, 2));
  console.log(`\nTotal additional issues: ${issues.length}`);

  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, 'detailed-issues.json'),
    JSON.stringify(issues, null, 2)
  );
}

main().catch((err) => {
  console.error('Fatal error in detailed-qa:', err);
  process.exit(1);
});
