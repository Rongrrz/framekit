import { expect, test } from '@playwright/test';

test('offers a working landing page and readable, linkable documentation at different widths', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/playground/index.html');
    await expect(page.getByRole('heading', { name: 'UI you can hold onto.' })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`home-${width}.png`) });
    const navigation = page.getByRole('navigation', { name: 'Primary', exact: true });
    const buttons = await navigation.getByRole('button').all();
    const boxes = (await Promise.all(buttons.map((button) => button.boundingBox())))
      .filter((box) => box !== null)
      .sort((a, b) => a.x - b.x);
    for (let index = 1; index < boxes.length; index += 1) {
      expect(boxes[index]!.x).toBeGreaterThanOrEqual(boxes[index - 1]!.x + boxes[index - 1]!.width);
    }
    const counter = page.getByRole('button', { name: /^Clicks: \d+$/ });
    await counter.click();
    await expect(counter).toHaveText('Clicks: 1');
    const main = page.getByRole('main');
    expect(await main.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true,
    );
    await page.getByRole('button', { name: /Get started/i }).click();
    await expect(page).toHaveURL(/#\/guide$/);
    await expect(page.getByRole('heading', { name: 'Getting started', exact: true })).toBeVisible();
    const headingSize = await page
      .getByRole('heading', { name: 'Getting started', exact: true })
      .evaluate((element) =>
        Number.parseFloat(
          getComputedStyle(element.querySelector('[data-framekit-text]')!).fontSize,
        ),
      );
    expect(headingSize).toBeGreaterThanOrEqual(34);
    if (width < 960) {
      await page.getByRole('button', { name: 'Browse documentation' }).click();
    }
    await page
      .getByRole('navigation', { name: 'Documentation topics' })
      .getByRole('link', { name: 'Runtime inspector', exact: true })
      .click();
    await expect(page).toHaveURL(/#\/devtools$/);
    await expect(
      page.getByRole('heading', { name: 'Runtime inspector', exact: true }),
    ).toBeVisible();
    expect(await main.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`docs-${width}.png`) });
  }
  expect(errors).toEqual([]);
});

test('opens each chapter directly and keeps navigation reachable after scrolling', async ({
  page,
}) => {
  for (const route of [
    'elements',
    'layout',
    'state',
    'lifecycle',
    'animation',
    'overlays',
    'api',
  ]) {
    await page.goto(`/playground/index.html#/${route}`);
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
    const main = page.getByRole('main');
    await main.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(page.getByRole('navigation', { name: 'Continue reading' })).toBeVisible();
    await expect(
      page
        .getByRole('navigation', { name: 'Documentation topics' })
        .getByRole('link', { name: 'Getting started' }),
    ).toBeVisible();
  }
});

test('the overlay chapter demonstrates usable keyboard and pointer interactions', async ({
  page,
}) => {
  await page.goto('/playground/index.html#/overlays');
  const trigger = page.getByRole('button', { name: 'Default spring', exact: true });
  await trigger.focus();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Say hello', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Hello from the dropdown!');
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('keeps the reading surface usable in dark mode', async ({ page }, info) => {
  await page.goto('/playground/index.html#/guide');
  if ((await page.locator('html').getAttribute('data-framekit-theme')) !== 'dark') {
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  }
  await expect
    .poll(() =>
      page.getByRole('main').evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .toBe('rgb(10, 13, 18)');
  await page.screenshot({ path: info.outputPath('guide-dark.png') });
  await expect(page.getByRole('heading', { name: 'Getting started', exact: true })).toBeVisible();
});
