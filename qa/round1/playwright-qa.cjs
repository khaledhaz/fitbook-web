/**
 * FitBook Web — QA Round 1 Playwright Script
 * Drives Chromium as saqr@gmail.com (trainee) and captures bugs.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8871';
const EMAIL = 'saqr@gmail.com';
const PASSWORD = 'saqr1111';
const SCREENSHOTS_DIR = path.join(__dirname);
const WIDTHS = [375, 768, 1280];

// Ensure screenshots directory exists
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function waitForPageSettle(page, timeout = 5000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // OK — just proceed
  }
  await page.waitForTimeout(1000);
}

async function checkOverflow(page) {
  const results = {};
  const originalWidth = page.viewportSize()?.width ?? 1280;
  const originalHeight = page.viewportSize()?.height ?? 800;

  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 812 });
    await page.waitForTimeout(400);
    const overflows = await page.evaluate(() => {
      const scrollW = document.documentElement.scrollWidth;
      const innerW = window.innerWidth;
      return { scrollW, innerW, overflows: scrollW > innerW };
    });
    results[w] = overflows;
  }

  // Restore
  await page.setViewportSize({ width: originalWidth, height: originalHeight });
  return results;
}

async function screenshot(page, name, width = 375) {
  await page.setViewportSize({ width, height: 812 });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, `${name}_${width}.png`),
    fullPage: false,
  });
}

// ─── Bug collection ───────────────────────────────────────────────────────────

const bugs = [];
let bugId = 1;

function addBug({ severity, route_or_component, symptom, evidence, area }) {
  bugs.push({ id: bugId++, severity, route_or_component, symptom, evidence, area });
  console.log(`  [BUG #${bugId - 1}] ${severity} — ${symptom}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  const pageErrors = [];
  const networkFailures = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push({ message: err.message, stack: err.stack });
  });

  page.on('response', async (resp) => {
    const url = resp.url();
    const status = resp.status();
    if (url.includes('supabase.co') && status >= 400) {
      let body = '';
      try {
        body = await resp.text();
        body = body.substring(0, 300);
      } catch {}
      networkFailures.push({ url, status, body });
    }
  });

  // ─── Sign In ────────────────────────────────────────────────────────────────

  console.log('\n=== SIGN IN ===');
  await page.goto(`${BASE}/#/signin`);
  await waitForPageSettle(page, 3000);

  // Check for crash on sign-in page
  const signinContent = await page.content();
  if (signinContent.includes('undefined') && !signinContent.includes('input')) {
    addBug({
      severity: 'HIGH',
      route_or_component: '/#/signin',
      symptom: 'Sign-in page blank or broken',
      evidence: 'No input elements found',
      area: 'foundation',
    });
  }

  try {
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.toString().includes('/home'), { timeout: 15000 });
    console.log('  Signed in successfully, landed on:', page.url());
  } catch (e) {
    addBug({
      severity: 'HIGH',
      route_or_component: '/#/signin',
      symptom: 'Sign-in failed or redirect did not happen',
      evidence: e.message.substring(0, 200),
      area: 'foundation',
    });
    await browser.close();
    return;
  }

  await waitForPageSettle(page);

  // Capture saqr's userId from page URL or profile navigation
  let saqrUserId = null;
  let conversationId = null;

  // ─── Helper to clear errors and check after navigation ──────────────────────

  function clearErrors() {
    consoleErrors.length = 0;
    pageErrors.length = 0;
    networkFailures.length = 0;
  }

  async function visitAndAudit(route, label, area, opts = {}) {
    clearErrors();
    console.log(`\n=== ${label.toUpperCase()} (${route}) ===`);

    await page.goto(`${BASE}/#${route}`);
    await waitForPageSettle(page, opts.settleTimeout ?? 6000);

    // Check page errors
    for (const err of pageErrors) {
      addBug({
        severity: 'HIGH',
        route_or_component: route,
        symptom: 'Uncaught JS exception / React error boundary',
        evidence: err.message.substring(0, 300),
        area,
      });
    }

    // Check console errors
    const relevantConsoleErrors = consoleErrors.filter(
      (e) => !e.text.includes('favicon') && !e.text.includes('ResizeObserver')
    );
    for (const err of relevantConsoleErrors) {
      addBug({
        severity: 'MED',
        route_or_component: route,
        symptom: 'Console error logged',
        evidence: err.text.substring(0, 300),
        area,
      });
    }

    // Check network failures
    for (const fail of networkFailures) {
      const sev = fail.status === 401 || fail.status === 403 ? 'HIGH' : 'MED';
      addBug({
        severity: sev,
        route_or_component: route,
        symptom: `Supabase request failed: HTTP ${fail.status}`,
        evidence: `URL: ${fail.url.substring(0, 150)} | Body: ${fail.body.substring(0, 150)}`,
        area,
      });
    }

    // Check for blank screen (no visible text content)
    const visibleText = await page.evaluate(() => document.body.innerText.trim());
    if (!visibleText || visibleText.length < 10) {
      addBug({
        severity: 'HIGH',
        route_or_component: route,
        symptom: 'Blank screen or no visible content',
        evidence: `innerText length: ${visibleText.length}`,
        area,
      });
    }

    // Overflow check
    const overflow = await checkOverflow(page);
    for (const [w, info] of Object.entries(overflow)) {
      if (info.overflows) {
        addBug({
          severity: 'MED',
          route_or_component: route,
          symptom: `Horizontal overflow at ${w}px`,
          evidence: `scrollWidth=${info.scrollW} > innerWidth=${info.innerW}`,
          area,
        });
      }
    }

    // Screenshots at 375 and 1280
    await screenshot(page, label.replace(/[^a-zA-Z0-9]/g, '_'), 375);
    await page.setViewportSize({ width: 1280, height: 800 });
    await screenshot(page, label.replace(/[^a-zA-Z0-9]/g, '_'), 1280);
    await page.setViewportSize({ width: 1280, height: 800 });

    return { visibleText, consoleErrors: [...consoleErrors], networkFailures: [...networkFailures] };
  }

  // ─── Get saqr's user ID by checking profile page ─────────────────────────

  // Navigate to home first, wait for it to load
  await page.goto(`${BASE}/#/home`);
  await waitForPageSettle(page, 8000);

  // Try to extract userId from network requests or page state
  // We'll navigate to profile and check the URL or from supabase user
  try {
    // Intercept the Supabase user info
    const userIdScript = await page.evaluate(() => {
      // Try to get it from localStorage (Supabase stores session there)
      try {
        const keys = Object.keys(localStorage);
        for (const k of keys) {
          if (k.includes('supabase') || k.includes('auth')) {
            const val = JSON.parse(localStorage.getItem(k) || '{}');
            if (val.user?.id) return val.user.id;
            if (val?.currentSession?.user?.id) return val.currentSession.user.id;
          }
        }
      } catch {}
      return null;
    });
    if (userIdScript) {
      saqrUserId = userIdScript;
      console.log('  saqr userId:', saqrUserId);
    }
  } catch {}

  // ─── TRAINEE PAGES ─────────────────────────────────────────────────────────

  await visitAndAudit('/home', 'trainee_home', 'trainee');

  // Check specific home page content
  const homeText = await page.evaluate(() => document.body.innerText);
  if (!homeText.includes('Workout') && !homeText.includes('workout')) {
    addBug({
      severity: 'MED',
      route_or_component: '/home',
      symptom: "Today's Workout section missing from home page",
      evidence: 'No "Workout" text found in page body',
      area: 'trainee',
    });
  }

  await visitAndAudit('/schedule', 'trainee_schedule', 'trainee');

  // Check schedule tabs
  const scheduleTabs = await page.locator('[role="tab"]').count();
  if (scheduleTabs < 3) {
    addBug({
      severity: 'MED',
      route_or_component: '/schedule',
      symptom: `Schedule has ${scheduleTabs} tabs instead of expected 3 (Workout/Meals/Supplements)`,
      evidence: `Role=tab count: ${scheduleTabs}`,
      area: 'trainee',
    });
  }

  await visitAndAudit('/progress', 'trainee_progress', 'trainee');
  await visitAndAudit('/chats', 'trainee_chats', 'chat');

  // Try to get conversation ID from chats list
  clearErrors();
  await page.goto(`${BASE}/#/chats`);
  await waitForPageSettle(page, 6000);
  try {
    // Click the first conversation
    const firstConvo = page.locator('ul[aria-label="Conversations"] li button').first();
    const count = await firstConvo.count();
    if (count > 0) {
      await firstConvo.click();
      await page.waitForURL((url) => url.toString().includes('/chat/'), { timeout: 5000 });
      const currentUrl = page.url();
      const match = currentUrl.match(/\/chat\/([^#?]+)/);
      if (match) {
        conversationId = match[1];
        console.log('  Found conversation ID:', conversationId);
      }
    } else {
      addBug({
        severity: 'MED',
        route_or_component: '/chats',
        symptom: 'No conversations found in chats list for saqr',
        evidence: 'List is empty — no trainee ↔ trainer conversation rendered',
        area: 'chat',
      });
    }
  } catch (e) {
    addBug({
      severity: 'MED',
      route_or_component: '/chats',
      symptom: 'Could not click into a conversation',
      evidence: e.message.substring(0, 200),
      area: 'chat',
    });
  }

  // Chat detail
  if (conversationId) {
    await visitAndAudit(`/chat/${conversationId}`, 'chat_detail', 'chat');

    // Check composer is present
    const composer = await page.locator('textarea[aria-label="Message composer"]').count();
    if (!composer) {
      addBug({
        severity: 'HIGH',
        route_or_component: `/chat/${conversationId}`,
        symptom: 'Message composer textarea not found',
        evidence: 'aria-label="Message composer" not in DOM',
        area: 'chat',
      });
    }

    // Send a test message
    clearErrors();
    try {
      await page.goto(`${BASE}/#/chat/${conversationId}`);
      await waitForPageSettle(page, 6000);
      const textarea = page.locator('textarea[aria-label="Message composer"]');
      await textarea.fill('QA test message - please ignore');
      await page.click('button[aria-label="Send message"]');
      await page.waitForTimeout(2000);

      // Check message appears
      const msgText = await page.evaluate(() => document.body.innerText);
      if (!msgText.includes('QA test message')) {
        addBug({
          severity: 'HIGH',
          route_or_component: `/chat/${conversationId}`,
          symptom: 'Sent message did not appear in chat (optimistic UI or persistence failed)',
          evidence: 'Text "QA test message" not found in page after send',
          area: 'chat',
        });
      }

      // Check for send errors
      for (const err of pageErrors) {
        addBug({
          severity: 'HIGH',
          route_or_component: `/chat/${conversationId}`,
          symptom: 'JS error after sending message',
          evidence: err.message.substring(0, 300),
          area: 'chat',
        });
      }
    } catch (e) {
      addBug({
        severity: 'HIGH',
        route_or_component: `/chat/${conversationId}`,
        symptom: 'Error during message send interaction',
        evidence: e.message.substring(0, 200),
        area: 'chat',
      });
    }
  }

  await visitAndAudit('/profile', 'trainee_profile', 'trainee');

  // Extract saqr's userId from profile page if not yet obtained
  if (!saqrUserId) {
    // Check URL after profile navigation
    const profileUrl = page.url();
    console.log('  Profile URL:', profileUrl);
  }

  // Workout session (without dayId — should show error state, not crash)
  await visitAndAudit('/workout/session', 'workout_session_no_dayid', 'trainee');

  // Check it shows "No workout day selected" error state (not a crash)
  const sessionText = await page.evaluate(() => document.body.innerText);
  if (!sessionText.includes('No workout day') && !sessionText.includes('workout day')) {
    addBug({
      severity: 'MED',
      route_or_component: '/workout/session',
      symptom: 'Workout session without dayId does not show proper error state',
      evidence: `Page text does not contain "No workout day": "${sessionText.substring(0, 200)}"`,
      area: 'trainee',
    });
  }

  await visitAndAudit('/meals', 'trainee_meals', 'trainee');

  // Try meal variation selection
  clearErrors();
  await page.goto(`${BASE}/#/meals`);
  await waitForPageSettle(page, 8000);
  try {
    // Find meal cards and try to select a variation
    const radioButtons = page.locator('button[role="radio"]');
    const radioCount = await radioButtons.count();
    if (radioCount > 0) {
      await radioButtons.first().click();
      await page.waitForTimeout(2000);
      // Check for success toast or error
      const bodyText = await page.evaluate(() => document.body.innerText);
      const hasError = pageErrors.length > 0;
      if (hasError) {
        addBug({
          severity: 'HIGH',
          route_or_component: '/meals',
          symptom: 'JS error when selecting meal variation',
          evidence: pageErrors[0]?.message?.substring(0, 300),
          area: 'trainee',
        });
      }
      console.log('  Variation selection attempted:', radioCount, 'options found');
    } else {
      // Could be no meal plan assigned — check if empty state is shown
      const hasEmptyState = await page.evaluate(() =>
        document.body.innerText.includes('No meal plan') || document.body.innerText.includes('No variation')
      );
      if (!hasEmptyState) {
        addBug({
          severity: 'MED',
          route_or_component: '/meals',
          symptom: 'No meal variation radio buttons and no empty state message',
          evidence: `Page text: ${(await page.evaluate(() => document.body.innerText)).substring(0, 200)}`,
          area: 'trainee',
        });
      }
    }
  } catch (e) {
    addBug({
      severity: 'MED',
      route_or_component: '/meals',
      symptom: 'Error interacting with meal variations',
      evidence: e.message.substring(0, 200),
      area: 'trainee',
    });
  }

  await visitAndAudit('/supplements', 'trainee_supplements', 'trainee');
  await visitAndAudit('/body-measurements', 'trainee_body_measurements', 'trainee');

  // Toggle units and check persistence
  await visitAndAudit('/units', 'trainee_units', 'trainee');

  clearErrors();
  await page.goto(`${BASE}/#/units`);
  await waitForPageSettle(page, 5000);
  try {
    // Find the imperial option and click it
    const imperialBtn = page.locator('button:has-text("Imperial"), [aria-label*="Imperial"], button:has-text("imperial")').first();
    const imperialCount = await imperialBtn.count();
    if (imperialCount > 0) {
      await imperialBtn.click();
      await page.waitForTimeout(500);
      // Find save button
      const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]').first();
      const saveCount = await saveBtn.count();
      if (saveCount > 0) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
        // Check for errors
        if (pageErrors.length > 0) {
          addBug({
            severity: 'MED',
            route_or_component: '/units',
            symptom: 'JS error when toggling units',
            evidence: pageErrors[0]?.message?.substring(0, 300),
            area: 'trainee',
          });
        }
      }
    }
    // Restore to metric
    await page.goto(`${BASE}/#/units`);
    await waitForPageSettle(page, 4000);
    const metricBtn = page.locator('button:has-text("Metric"), [aria-label*="Metric"]').first();
    if (await metricBtn.count() > 0) {
      await metricBtn.click();
      await page.waitForTimeout(300);
      const saveBtnAgain = page.locator('button:has-text("Save"), button[type="submit"]').first();
      if (await saveBtnAgain.count() > 0) await saveBtnAgain.click();
    }
  } catch (e) {
    console.log('  Units toggle error:', e.message.substring(0, 100));
  }

  await visitAndAudit('/connections', 'trainee_connections', 'connections-onboarding');

  // Check connections page has the correct tabs
  const tabCount = await page.locator('[role="tab"]').count();
  if (tabCount < 2) {
    addBug({
      severity: 'MED',
      route_or_component: '/connections',
      symptom: `Connections page has ${tabCount} tabs, expected at least 2 (Incoming/Outgoing/Find Trainer)`,
      evidence: `role=tab count: ${tabCount}`,
      area: 'connections-onboarding',
    });
  }

  // Profile View — saqr's own profile
  if (saqrUserId) {
    await visitAndAudit(`/profile/view/${saqrUserId}`, 'profile_view_self', 'connections-onboarding');
  } else {
    // Try with a placeholder to see what happens with invalid userId
    console.log('\n  WARNING: Could not determine saqr userId, skipping profile/view test');
    addBug({
      severity: 'LOW',
      route_or_component: '/profile/view/:userId',
      symptom: 'Could not extract saqr userId from session to test profile view page',
      evidence: 'userId not found in localStorage supabase session keys',
      area: 'connections-onboarding',
    });
  }

  // Vitals route (should redirect trainee with vitals to /home, or show vitals form)
  clearErrors();
  console.log('\n=== VITALS (/vitals) ===');
  await page.goto(`${BASE}/#/vitals`);
  await waitForPageSettle(page, 5000);
  const vitalsUrl = page.url();
  const vitalsText = await page.evaluate(() => document.body.innerText);
  console.log('  After visiting /vitals, ended up at:', vitalsUrl);
  // Should either show vitals form OR redirect to /home (saqr already has vitals)
  // If it shows a blank page, that's a bug
  if (!vitalsText || vitalsText.trim().length < 10) {
    addBug({
      severity: 'HIGH',
      route_or_component: '/vitals',
      symptom: 'Vitals page is blank',
      evidence: `innerText length: ${vitalsText.length}`,
      area: 'connections-onboarding',
    });
  }
  for (const err of pageErrors) {
    addBug({
      severity: 'HIGH',
      route_or_component: '/vitals',
      symptom: 'JS error on vitals page',
      evidence: err.message.substring(0, 300),
      area: 'connections-onboarding',
    });
  }

  // ─── Check for missing /vitals route (spec says QA must check /#/vitals) ─────
  // But Router.tsx defines /vitals → VitalsOnboardingPage, so it should exist

  // ─── Workout session WITH a dayId from home page ──────────────────────────────

  clearErrors();
  console.log('\n=== WORKOUT SESSION (with dayId from home) ===');
  await page.goto(`${BASE}/#/home`);
  await waitForPageSettle(page, 8000);
  try {
    const startBtn = page.locator('button:has-text("Start Workout")').first();
    if (await startBtn.count() > 0) {
      await startBtn.click();
      await waitForPageSettle(page, 5000);
      const sessionUrl = page.url();
      console.log('  Navigated to:', sessionUrl);

      // Check page loaded with exercises
      const sessionText = await page.evaluate(() => document.body.innerText);
      if (!sessionText.includes('Workout Session') && !sessionText.includes('Start Session')) {
        addBug({
          severity: 'MED',
          route_or_component: '/workout/session',
          symptom: 'Workout session page missing expected content after navigation from home',
          evidence: `Text: "${sessionText.substring(0, 200)}"`,
          area: 'trainee',
        });
      }

      // Try to start a session
      const startSessionBtn = page.locator('button:has-text("Start Session")').first();
      if (await startSessionBtn.count() > 0) {
        await startSessionBtn.click();
        await page.waitForTimeout(3000);

        // Check for session started (timer should appear)
        const afterStartText = await page.evaluate(() => document.body.innerText);
        if (!afterStartText.includes(':') && !afterStartText.includes('Complete Workout')) {
          addBug({
            severity: 'MED',
            route_or_component: '/workout/session',
            symptom: 'Session did not start — timer or Complete Workout button not shown',
            evidence: `Text after start: "${afterStartText.substring(0, 200)}"`,
            area: 'trainee',
          });
        }

        // Check for errors during session start
        for (const fail of networkFailures) {
          addBug({
            severity: 'HIGH',
            route_or_component: '/workout/session',
            symptom: `Network failure during workout session start: HTTP ${fail.status}`,
            evidence: `URL: ${fail.url.substring(0, 150)} | Body: ${fail.body.substring(0, 150)}`,
            area: 'trainee',
          });
        }

        // Try logging a set if session started
        clearErrors();
        const weightInputs = page.locator('input[aria-label*="weight"]');
        const weightCount = await weightInputs.count();
        if (weightCount > 0) {
          await weightInputs.first().fill('80');
          const repsInput = page.locator('input[aria-label*="reps"]').first();
          await repsInput.fill('10');
          await repsInput.blur(); // trigger onBlur save
          await page.waitForTimeout(2000);

          // Check for set save errors
          for (const fail of networkFailures) {
            addBug({
              severity: 'HIGH',
              route_or_component: '/workout/session',
              symptom: `Network failure saving workout set: HTTP ${fail.status}`,
              evidence: `URL: ${fail.url.substring(0, 150)} | Body: ${fail.body.substring(0, 150)}`,
              area: 'trainee',
            });
          }
        } else {
          addBug({
            severity: 'MED',
            route_or_component: '/workout/session',
            symptom: 'No weight inputs found after session start — exercises may not have loaded',
            evidence: 'input[aria-label*="weight"] count: 0',
            area: 'trainee',
          });
        }
      } else {
        console.log('  No "Start Session" button found — may already be in session or no exercises');
      }

      // Screenshot the workout session
      await screenshot(page, 'workout_session_active', 375);
      await page.setViewportSize({ width: 1280, height: 800 });
      await screenshot(page, 'workout_session_active', 1280);
    } else {
      console.log('  No "Start Workout" button on home — either rest day or no plan');
    }
  } catch (e) {
    addBug({
      severity: 'MED',
      route_or_component: '/workout/session',
      symptom: 'Error during workout session interaction',
      evidence: e.message.substring(0, 200),
      area: 'trainee',
    });
  }

  // ─── Check /#/vitals specifically as spec-listed route ─────────────────────

  // ─── Trainer-side route check (saqr is trainee, should redirect) ──────────
  clearErrors();
  console.log('\n=== TRAINER HOME (trainee should be redirected) ===');
  await page.goto(`${BASE}/#/trainer/home`);
  await waitForPageSettle(page, 5000);
  const trainerUrl = page.url();
  if (trainerUrl.includes('/trainer/home')) {
    addBug({
      severity: 'HIGH',
      route_or_component: '/trainer/home',
      symptom: 'Trainee user can access trainer-only route — auth guard failed',
      evidence: `URL stayed at: ${trainerUrl}`,
      area: 'foundation',
    });
  } else {
    console.log('  Correctly redirected to:', trainerUrl);
  }

  // ─── Check specific API calls succeed ────────────────────────────────────────

  // Navigate to supplements to trigger the supplement RPC
  clearErrors();
  await page.goto(`${BASE}/#/supplements`);
  await waitForPageSettle(page, 8000);
  const suppNetworkFails = networkFailures.filter((f) => f.url.includes('supplement'));
  for (const fail of suppNetworkFails) {
    addBug({
      severity: 'HIGH',
      route_or_component: '/supplements',
      symptom: `Supplement API call failed: HTTP ${fail.status}`,
      evidence: `URL: ${fail.url.substring(0, 150)} | Body: ${fail.body.substring(0, 150)}`,
      area: 'trainee',
    });
  }

  // Navigate to progress to trigger exercise progress RPC
  clearErrors();
  await page.goto(`${BASE}/#/progress`);
  await waitForPageSettle(page, 8000);
  const progressNetworkFails = networkFailures.filter(
    (f) => f.url.includes('progress') || f.url.includes('measurement')
  );
  for (const fail of progressNetworkFails) {
    addBug({
      severity: 'HIGH',
      route_or_component: '/progress',
      symptom: `Progress API call failed: HTTP ${fail.status}`,
      evidence: `URL: ${fail.url.substring(0, 150)} | Body: ${fail.body.substring(0, 150)}`,
      area: 'trainee',
    });
  }

  // ─── AppShell nav link check ─────────────────────────────────────────────────

  clearErrors();
  await page.goto(`${BASE}/#/home`);
  await waitForPageSettle(page, 5000);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);

  // Check for bottom nav bar
  const navItems = await page.locator('nav a, nav button').count();
  console.log(`\n  Bottom nav items at 375px: ${navItems}`);
  if (navItems === 0) {
    addBug({
      severity: 'HIGH',
      route_or_component: 'AppShell',
      symptom: 'No navigation items found at mobile (375px)',
      evidence: 'nav a, nav button count: 0',
      area: 'foundation',
    });
  }

  await page.setViewportSize({ width: 1280, height: 800 });

  // ─── Final summary ────────────────────────────────────────────────────────────

  await browser.close();

  console.log('\n\n=== FINAL BUG REPORT ===\n');
  console.log(JSON.stringify(bugs, null, 2));

  const highCount = bugs.filter((b) => b.severity === 'HIGH').length;
  const medCount = bugs.filter((b) => b.severity === 'MED').length;
  const lowCount = bugs.filter((b) => b.severity === 'LOW').length;

  console.log(`\nTotal: ${bugs.length} bugs`);
  console.log(`  HIGH: ${highCount}`);
  console.log(`  MED:  ${medCount}`);
  console.log(`  LOW:  ${lowCount}`);

  // Save to file
  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, 'bugs.json'),
    JSON.stringify({ bugs, summary: { total: bugs.length, high: highCount, med: medCount, low: lowCount } }, null, 2)
  );

  console.log('\nBugs saved to qa/round1/bugs.json');
  console.log('Screenshots saved to qa/round1/');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
