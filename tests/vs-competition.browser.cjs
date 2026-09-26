const assert = require('node:assert/strict');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const comparisonUrl = 'https://panquire.com/pages/compare?preview_theme_id=191626870968';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(comparisonUrl, { waitUntil: 'domcontentloaded' });
    console.log('Loaded', page.url(), await page.title());
    console.log('Comparison sections:', await page.locator('pq-comparison').count());
    console.log('Data/JS:', await page.locator('script[src*="vs-competition"]').getAttribute('src').catch(() => null));
    const root = page.locator('pq-comparison');
    await page.waitForFunction(() => document.querySelector('pq-comparison')?.selected?.panquire).catch(async error => {
      console.log('Page errors:', errors, 'Body:', (await page.locator('body').innerText()).slice(0, 1600));
      await page.screenshot({ path: join(__dirname, '../.shopify-temp/compare-load-error.png'), fullPage: true });
      throw error;
    });
    const select = side => root.locator(`[data-selector="${side}"]`);
    const trigger = side => select(side).locator('[data-select-trigger]');
    const state = () => root.evaluate(node => ({
      left: node.selected.panquire.handle, right: node.selected.competitor.handle,
      choices: node.selects.competitor.records.map(record => record.handle),
      rows: [...node.querySelectorAll('[data-differences] tbody tr[data-spec]')].map(row => row.dataset.spec),
      params: Object.fromEntries(new URL(location.href).searchParams),
      metrics: [...node.querySelectorAll('[data-metrics] button')].map(button => button.textContent),
      text: node.querySelector('[data-differences]').textContent
    }));
    const choose = async (side, handle) => {
      await trigger(side).click();
      await select(side).locator(`[data-value="${handle}"]`).click();
      assert.equal(await trigger(side).getAttribute('aria-expanded'), 'false');
    };
    assert.equal((await state()).left, 't-01');
    assert.equal((await state()).right, 'pro-s-17');
    assert.equal(await root.locator('.pq-compare__methodology h2').textContent(), 'Comparison Methodology');
    assert.equal(await root.locator('.pq-compare__methodology a[href="mailto:support@panquire.com"]').textContent(), 'support@panquire.com');
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.fonts.check('700 24px "Panquire Montserrat"')), true);
    assert.equal(await page.evaluate(() => document.fonts.check('400 14px "Panquire Work Sans"')), true);
    assert.match(await root.locator('.pq-compare__methodology h2').evaluate(node => getComputedStyle(node).fontFamily), /Panquire Montserrat/);
    assert.match(await root.locator('.pq-compare__methodology p').first().evaluate(node => getComputedStyle(node).fontFamily), /Panquire Work Sans/);
    assert.match(await trigger('panquire').evaluate(node => getComputedStyle(node).fontFamily), /Panquire Montserrat/);
    assert.match(await root.locator('[data-differences] tbody td').first().evaluate(node => getComputedStyle(node).fontFamily), /Panquire Work Sans/);
    assert.ok(await trigger('panquire').evaluate(node => parseFloat(getComputedStyle(node).fontSize) >= 20));
    assert.equal(await page.locator('.pq-desktop-nav a[href="/pages/compare"]').count(), 1);
    assert.equal(await page.locator('.pq-mobile-menu a[href="/pages/compare"]').count(), 1);
    await trigger('panquire').click();
    assert.equal(await trigger('panquire').getAttribute('aria-expanded'), 'true');
    await page.waitForTimeout(520);
    assert.notEqual(await trigger('panquire').locator('svg').evaluate(node => getComputedStyle(node).transform), 'none');
    const triggerBox = await trigger('panquire').boundingBox();
    await page.mouse.move(triggerBox.x + triggerBox.width / 2, triggerBox.y + triggerBox.height / 2);
    await page.waitForTimeout(180);
    assert.equal(await trigger('panquire').getAttribute('aria-expanded'), 'true');
    const optionBox = await select('panquire').locator('[role="option"]').first().boundingBox();
    await page.mouse.move(optionBox.x + optionBox.width / 2, optionBox.y + optionBox.height / 2);
    await page.waitForTimeout(180);
    assert.equal(await trigger('panquire').getAttribute('aria-expanded'), 'true');
    await page.mouse.move(2, 2);
    await page.waitForTimeout(180);
    assert.equal(await trigger('panquire').getAttribute('aria-expanded'), 'false');
    await trigger('panquire').click();
    await trigger('competitor').click();
    assert.equal(await trigger('panquire').getAttribute('aria-expanded'), 'false');
    await page.keyboard.press('Escape');
    assert.equal(await trigger('competitor').getAttribute('aria-expanded'), 'false');
    await trigger('competitor').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    assert.equal((await state()).right, 'light-bee-x');
    await trigger('competitor').click();
    await page.mouse.click(2, 2);
    assert.equal(await trigger('competitor').getAttribute('aria-expanded'), 'false');
    await choose('panquire', 't-02');
    let current = await state();
    assert.equal(current.right, 'ultra-bee');
    assert.deepEqual(current.choices, ['ultra-bee', 'x7-spark', 'pro-ss-2-0', 'nova-5-pro', 'mantis-x', 'falcon-pro']);
    assert.equal(current.params.panquire, 't-02');
    assert.equal(current.params.competitor, 'ultra-bee');
    assert.ok(!current.rows.includes('ready_to_ride_weight'));
    assert.ok(!current.rows.includes('battery_energy'));
    assert.ok(current.rows.includes('suspension'));
    await root.locator('details summary').click();
    assert.equal(await root.locator('details').getAttribute('open'), '');
    for (const handle of current.choices) {
      await choose('competitor', handle);
      const result = await state();
      assert.equal(result.params.competitor, handle);
      assert.ok(!/undefined|NaN|null/.test(result.text));
    }
    await choose('panquire', 't-01');
    current = await state();
    assert.equal(current.right, 'pro-s-17');
    assert.deepEqual(current.choices, ['pro-s-17', 'mantis-x', 'falcon-lite', 'x1-spark-l', 'light-bee-x']);
    for (const handle of current.choices) await choose('competitor', handle);
    await choose('competitor', 'pro-s-17');
    assert.equal(await root.locator('[data-differences] tr[data-spec="battery_energy"] .is-winner').getAttribute('class'), 'pq-compare__value pq-compare__value--competitor is-winner');
    assert.equal(await root.locator('[data-differences] tr[data-spec="ready_to_ride_weight"] .is-winner').count(), 1);
    assert.equal(await root.locator('[data-differences] tr[data-spec="peak_motor_power"] .is-winner').count(), 0);
    assert.equal(await root.locator('[data-differences] tr[data-spec="wheels"] .is-winner').count(), 0);
    await root.locator('[data-metrics] button').first().click();
    assert.ok(await root.locator('[data-differences] tr.is-focused').count());
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(__dirname, '../.shopify-temp/compare-desktop.png') });
    await trigger('competitor').click();
    await page.waitForTimeout(520);
    await page.screenshot({ path: join(__dirname, '../.shopify-temp/compare-dropdown.png') });
    await page.keyboard.press('Escape');
    await page.goto(`${comparisonUrl}&panquire=t-02&competitor=pro-s-17`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('pq-comparison')?.selected?.competitor?.handle === 'ultra-bee');
    assert.equal((await state()).params.competitor, 'ultra-bee');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const duration = await trigger('panquire').evaluate(node => getComputedStyle(node).transitionDuration);
    assert.ok(duration.split(',').every(value => parseFloat(value) <= .001));

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await mobile.goto(comparisonUrl, { waitUntil: 'domcontentloaded' });
    await mobile.waitForFunction(() => document.querySelector('pq-comparison')?.selected?.panquire);
    const mobileTrigger = mobile.locator('[data-selector="panquire"] [data-select-trigger]');
    assert.ok(await mobileTrigger.evaluate(node => parseFloat(getComputedStyle(node).fontSize) >= 18));
    await mobileTrigger.tap();
    assert.equal(await mobileTrigger.getAttribute('aria-expanded'), 'true');
    await mobile.locator('[data-selector="panquire"] [data-value="t-02"]').tap();
    assert.equal(await mobileTrigger.getAttribute('aria-expanded'), 'false');
    assert.equal(await mobile.locator('[data-selector="competitor"] [data-select-value]').textContent(), 'Surron Ultra Bee');
    await mobile.locator('[data-selector="competitor"] [data-select-trigger]').tap();
    await mobile.locator('[data-selector="competitor"] [data-value="falcon-pro"]').tap();
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await mobile.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await mobile.waitForTimeout(600);
    await mobile.screenshot({ path: join(__dirname, '../.shopify-temp/compare-mobile.png') });
    await mobile.goto('https://panquire.com/?preview_theme_id=191626870968', { waitUntil: 'domcontentloaded' });
    assert.equal(await mobile.locator('.pq-hero-content').evaluate(node => getComputedStyle(node).borderTopWidth), '2px');
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await mobile.screenshot({ path: join(__dirname, '../.shopify-temp/home-text-frames-mobile.png'), fullPage: false });

    const home = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await home.goto('https://panquire.com/?preview_theme_id=191626870968', { waitUntil: 'domcontentloaded' });
    await home.evaluate(() => document.fonts.ready);
    assert.match(await home.locator('h1').first().evaluate(node => getComputedStyle(node).fontFamily), /Panquire Montserrat/);
    assert.match(await home.locator('body').evaluate(node => getComputedStyle(node).fontFamily), /Panquire Work Sans/);
    const homeNavigationLink = home.locator('.pq-desktop-nav a, .menu-list__link').first();
    assert.match(await homeNavigationLink.evaluate(node => getComputedStyle(node).fontFamily), /Panquire Montserrat/);
    assert.equal(await homeNavigationLink.evaluate(node => getComputedStyle(node).fontWeight), '600');
    const framedHomeCopy = home.locator('.pq-hero-content, .pq-benefit, .pq-product-card').first();
    assert.equal(await framedHomeCopy.evaluate(node => getComputedStyle(node).borderTopWidth), '2px');
    assert.match(await framedHomeCopy.evaluate(node => getComputedStyle(node).boxShadow), /inset/);
    await home.screenshot({ path: join(__dirname, '../.shopify-temp/home-text-frames.png'), fullPage: false });
    await home.close();
    assert.deepEqual(errors, []);
    console.log('PASS: brand fonts across home/compare, desktop/mobile selectors, all 11 pairings, stable hover boundary, methodology, ordered reset, URL validation, winner/tie styling, chart interaction, full specs, reduced motion, navigation, and no page errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
