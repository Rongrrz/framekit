import { expect, test } from './fixtures.js';

for (const width of [1440, 390]) {
  test(`reveals reading progress after scrolling while keeping navigation fixed at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: width === 390 ? 'reduce' : 'no-preference' });
    await page.goto('/project-landing/index.html#/guide');

    const main = page.getByRole('main');
    const navigation = page.getByRole('navigation', { name: 'Primary', exact: true });
    const progress = page.getByRole('progressbar', {
      name: 'Reading progress',
      includeHidden: true,
    });

    await expect(progress).toBeHidden();
    expect((await navigation.boundingBox())!.y).toBe(0);
    await main.evaluate((element) => {
      element.scrollTop = 100;
    });
    await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBe(100);
    await expect(progress).toBeHidden();
    expect((await navigation.boundingBox())!.y).toBe(0);
    await main.evaluate((element) => {
      element.scrollTop = 200;
    });
    await expect(progress).toBeVisible();
    await expect(progress).toHaveCSS('opacity', '1');
    expect((await navigation.boundingBox())!.y).toBe(0);
    await main.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(progress).toHaveAttribute('aria-valuenow', '100');
    await main.evaluate((element) => {
      element.scrollTop = 100;
    });
    await expect(progress).toBeHidden();
    await main.evaluate((element) => {
      element.scrollTop = 300;
    });
    await expect(progress).toBeVisible();
    await navigation.getByRole('button', { name: 'Reference', exact: true }).click();
    await expect(page).toHaveURL(/#\/api$/);
    await expect(progress).toBeHidden();
    expect((await navigation.boundingBox())!.y).toBe(0);
  });
}

test('does not retain the theme tooltip after a pointer click and exit', async ({ page }) => {
  await page.goto('/project-landing/index.html#/api');

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
  await page.addInitScript(() =>
    window.localStorage.setItem('framekit-project-landing-theme', 'dark'),
  );
  await page.goto('/project-landing/index.html#/api');
  await expect(page.getByRole('article').locator('pre')).toBeVisible();

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
          code: getComputedStyle(code.closest('[data-framekit="ScrollingFrame"]')!).backgroundColor,
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
  await page.goto('/project-landing/index.html#/elements');

  const blocks = page.locator('.pg-code-block');
  const blockCount = await blocks.count();
  expect(blockCount).toBeGreaterThan(30);
  // All routes are persistent: this covers formatting and highlighting in every chapter and home.
  await expect(page.locator('.pg-code-block pre')).toHaveCount(blockCount);

  const example = page.getByRole('article').locator('.pg-code-block').first();
  const code = example.locator('pre');
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

    await expect(example.getByLabel('elements1Code code example')).toHaveCSS(
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
    await page.goto('/project-landing/index.html');
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
    await page.goto(`/project-landing/index.html#/${route}`);
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

test('keeps documentation topics reachable in short windows and restores the compact menu after resizing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 500 });
  await page.goto('/project-landing/index.html#/guide');
  const topics = page.getByRole('navigation', { name: 'Documentation topics' });
  const main = page.getByRole('main');
  await main.evaluate((element) => {
    element.scrollTop = 500;
  });
  await expect.poll(async () => (await topics.boundingBox())!.y).toBe(88);
  expect((await topics.boundingBox())!.height).toBeLessThanOrEqual(388);
  const last = topics.getByRole('link', { name: 'Runtime inspector', exact: true });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeVisible();
  expect(await topics.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 900 });
  await main.evaluate((element) => {
    element.scrollTop = 0;
  });
  const browse = page.getByRole('button', { name: 'Browse documentation' });
  await expect(browse).toBeVisible();
  await expect(topics).toBeHidden();
  await browse.click();
  await expect(topics).toBeVisible();
  await expect(browse).toHaveAttribute('aria-expanded', 'true');
  await page.setViewportSize({ width: 1440, height: 500 });
  await expect(browse).toBeHidden();
  await main.evaluate((element) => {
    element.scrollTop = 600;
  });
  await expect.poll(async () => (await topics.boundingBox())!.y).toBe(88);
  await page.setViewportSize({ width: 390, height: 900 });
  await main.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(browse).toBeVisible();
  await expect(browse).toHaveAttribute('aria-expanded', 'true');
  await browse.click();
  await expect(topics).toBeHidden();
});

test('the overlay chapter demonstrates usable keyboard and pointer interactions', async ({
  page,
}) => {
  await page.goto('/project-landing/index.html#/overlays');

  const trigger = page.getByRole('button', { name: 'Default spring', exact: true });
  await trigger.focus();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Say hello', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Hello from the dropdown!');
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('keeps the reading surface usable in dark mode', async ({ page }, info) => {
  await page.goto('/project-landing/index.html#/guide');

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
