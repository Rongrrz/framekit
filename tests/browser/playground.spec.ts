import { expect, test } from './fixtures.js';

test('shares navigation and theme across examples while resetting each demo on entry', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.addInitScript(() => window.localStorage.setItem('framekit-playground-theme', 'dark'));
  await page.goto('/playground/index.html');

  const navigation = page.getByRole('navigation', { name: 'Primary', exact: true });
  const originalNavigation = await navigation.elementHandle();
  await navigation.getByRole('button', { name: 'Examples', exact: true }).click();
  await expect(page).toHaveURL(/#\/examples$/);
  await expect(page.getByRole('heading', { name: 'Examples', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Insert at top', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('100,001 items');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('100,000 items');

  const fixed = page.getByRole('tab', { name: 'Fixed rows', exact: true });
  await fixed.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Measured rows', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Expand selected', exact: true })).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Inbox', exact: true })).toBeFocused();
  await expect(page.getByRole('listbox', { name: 'Virtual collection', exact: true })).toHaveCount(
    0,
  );

  const inbox = page.getByRole('listbox', { name: 'Inbox messages', exact: true });
  await expect(inbox).toBeVisible();
  await page.getByRole('searchbox', { name: 'Filter inbox', exact: true }).fill('no-such-message');
  await expect(page.getByRole('status')).toContainText('0 messages');
  await navigation.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(inbox).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await navigation.getByRole('button', { name: 'Docs', exact: true }).click();
  await expect(inbox).toHaveCount(0);
  await navigation.getByRole('button', { name: 'Examples', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: 'Filter inbox', exact: true })).toHaveValue('');
  await expect(page.getByRole('status')).toContainText('2000 messages');
  await expect(inbox).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  expect(await navigation.evaluate((node, original) => node === original, originalNavigation)).toBe(
    true,
  );

  await originalNavigation?.dispose();
});

test('does not retain the theme tooltip after a pointer click and exit', async ({ page }) => {
  await page.goto('/playground/index.html#/api');

  const toggle = page.getByRole('button', { name: /Switch to (light|dark) mode/ });
  const tooltip = page.getByRole('tooltip');
  await toggle.hover();
  await expect(tooltip).toBeVisible();
  await toggle.click();
  await page.mouse.move(500, 400);
  await expect(tooltip).toBeHidden();
  // Re-entering must still work without clicking elsewhere to clear focus.
  await toggle.hover();
  await expect(tooltip).toBeVisible();
  await page.mouse.move(500, 400);
  await expect(tooltip).toBeHidden();
});

test('switches the page and code palette immediately in both directions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => window.localStorage.setItem('framekit-playground-theme', 'dark'));
  await page.goto('/playground/index.html#/api');
  await expect(page.getByRole('article').locator('pre.shiki')).toBeVisible();

  for (const mode of ['light', 'dark', 'light'] as const) {
    const colors = await page
      .getByRole('button', { name: `Switch to ${mode} mode` })
      .evaluate((button) => {
        // Read in the click's call stack: waiting for the next frame would hide a theme animation.
        (button as HTMLButtonElement).click();

        const main = document.querySelector('[role="main"]')!;

        const block = [...document.querySelectorAll('article .pg-code-block')].find(
          (element) => element.getClientRects().length > 0,
        )!;

        const code = block.querySelector('pre')!;

        return {
          mode: document.documentElement.dataset.framekitTheme,
          page: getComputedStyle(main).backgroundColor,
          block: getComputedStyle(block).backgroundColor,
          code: getComputedStyle(code).backgroundColor,
        };
      });

    expect(colors).toEqual(
      mode === 'light'
        ? {
            mode,
            page: 'rgb(245, 247, 250)',
            block: 'rgb(255, 255, 255)',
            code: 'rgb(255, 255, 255)',
          }
        : {
            mode,
            page: 'rgb(10, 13, 18)',
            block: 'rgb(17, 22, 29)',
            code: 'rgb(30, 30, 30)',
          },
    );
  }
});

test('copies multiline examples and renders every code block with readable syntax and spacing', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string): Promise<void> => {
          document.documentElement.dataset.copiedExample = text;
        },
      },
    });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/playground/index.html#/elements');

  const blocks = page.locator('.pg-code-block');
  const blockCount = await blocks.count();
  expect(blockCount).toBeGreaterThan(30);
  // All routes are persistent: this covers formatting and highlighting in every chapter and home.
  await expect(page.locator('.pg-code-block pre.shiki')).toHaveCount(blockCount);

  const example = page.getByRole('article').locator('.pg-code-block').first();
  const code = example.locator('pre code');
  const source = (await code.textContent())!;
  expect(source).toContain("from 'framekit';\n\n");
  expect(source).toContain("\n  Text: 'Your profile',\n  TextSize: 24,\n");
  expect(source).toContain("TextTagName: 'h2'");
  await example.getByRole('button', { name: 'Copy elements1Code example' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-copied-example', source);
  expect(
    await code.evaluate((element) => {
      const selection = window.getSelection()!;
      const range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);

      const selected = selection.toString();
      selection.removeAllRanges();

      return selected;
    }),
  ).toBe(source);
  await expect(code).toHaveCSS('white-space', 'pre');
  await expect(code).toHaveCSS('line-height', '22px');

  for (const mode of ['light', 'dark'] as const) {
    if ((await page.locator('html').getAttribute('data-framekit-theme')) !== mode) {
      await page.getByRole('button', { name: `Switch to ${mode} mode` }).click();
    }

    await expect(example.locator('pre')).toHaveCSS(
      'background-color',
      mode === 'dark' ? 'rgb(30, 30, 30)' : 'rgb(255, 255, 255)',
    );

    const colors = await code
      .locator('span[style]')
      .evaluateAll((tokens) => new Set(tokens.map((token) => getComputedStyle(token).color)).size);

    expect(colors).toBeGreaterThan(3);
    await example.screenshot({ path: info.outputPath(`code-${mode}.png`) });
  }

  await page.setViewportSize({ width: 390, height: 900 });

  const scroll = example.getByLabel('elements1Code code example');
  await scroll.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  const main = page.getByRole('main');
  expect(await main.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
    true,
  );
  await example.screenshot({ path: info.outputPath('code-mobile.png') });
});

test('offers a working landing page and readable, linkable documentation at different widths', async ({
  page,
}, info) => {
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
