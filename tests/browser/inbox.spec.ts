import { expect, test } from '@playwright/test';

const settle = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.evaluate(
    () =>
      new Promise((done) =>
        requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done))),
      ),
  );
};

test('keeps the inbox anchored through late images, font loading, expansion, and filtering', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  let releaseImages = (): void => {};

  const imagesReady = new Promise<void>((resolve) => {
    releaseImages = resolve;
  });

  await page.route('**/attachment.svg*', async (route) => {
    if (route.request().resourceType() !== 'image') {
      await route.continue();

      return;
    }

    await imagesReady;
    await route.continue();
  });
  await page.setViewportSize({ width: 850, height: 900 });
  await page.goto('/playground/inbox.html');

  const list = page.getByRole('listbox', { name: 'Inbox messages' });
  await expect(list.getByRole('option').first()).toBeVisible();
  await settle(page);

  const anchor = list.locator('[data-message-id="2"]');
  await list.evaluate((element) => {
    const row = element.querySelector<HTMLElement>('[data-message-id="2"]')!;
    element.scrollTop = parseFloat(row.style.top) + 7;
  });

  const offset = () =>
    anchor.evaluate(
      (element) =>
        element.getBoundingClientRect().top -
        element.closest('[role="listbox"]')!.getBoundingClientRect().top,
    );

  await expect.poll(async () => Math.abs((await offset()) + 7)).toBeLessThan(1);
  await page.getByRole('button', { name: 'Load attachments' }).click();
  await expect(list.locator('[data-loaded="true"]')).toHaveCount(0);
  releaseImages();
  await expect(anchor.locator('[data-loaded="true"]')).toHaveCount(1);
  await settle(page);
  await expect.poll(async () => Math.abs((await offset()) + 7)).toBeLessThan(1);

  const beforeFont = await anchor.boundingBox();
  await page.getByRole('button', { name: 'Load reading font' }).click();
  await expect(page.getByRole('status')).toContainText('reading font ready');
  await settle(page);
  await expect.poll(async () => Math.abs((await offset()) + 7)).toBeLessThan(1);
  expect((await anchor.boundingBox())!.height).not.toBe(beforeFont!.height);
  await anchor.click();

  const beforeExpand = await anchor.boundingBox();
  await page.getByRole('button', { name: 'Expand selected' }).click();
  await expect
    .poll(async () => (await anchor.boundingBox())!.height)
    .toBeGreaterThan(beforeExpand!.height);

  const filter = page.getByRole('searchbox', { name: 'Filter inbox' });
  await filter.fill('Design review');
  await expect(page.getByRole('status')).toContainText('1000 messages');
  await expect(list.getByRole('option').first()).toHaveAccessibleName(/^Design review/);
  await filter.fill('no-such-message');
  await expect(list.getByRole('option')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('0 messages');
  await filter.fill('');
  await expect(page.getByRole('status')).toContainText('2000 messages');
  await list.focus();
  await page.keyboard.press('End');

  const last = list.locator('[data-message-id="1999"]');
  await expect(last).toHaveAttribute('aria-selected', 'true');
  await expect(last).toBeInViewport();
  await page.keyboard.press('Home');
  await expect(list.locator('[data-message-id="0"]')).toBeInViewport();
  expect(await list.getByRole('option').count()).toBeLessThan(24);
  await expect
    .poll(() =>
      list.evaluate((element) => {
        const rows = [...element.querySelectorAll<HTMLElement>('[role="option"]')];

        return rows.every(
          (row, index) =>
            index === 0 ||
            row.getBoundingClientRect().top >= rows[index - 1]!.getBoundingClientRect().bottom - 1,
        );
      }),
    )
    .toBe(true);
  await page.screenshot({ path: info.outputPath('inbox-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await settle(page);
  await page.screenshot({ path: info.outputPath('inbox-mobile.png') });
  expect(
    await page
      .getByRole('main')
      .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
  ).toBe(true);
  await page.getByRole('button', { name: 'Destroy inbox' }).click();
  await expect(page.getByRole('main')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      [...document.fonts].some((font) => font.family === 'FrameKitInboxReading'),
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});

test('releases rows and pending image and font work when the screen is destroyed', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  let release = (): void => {};

  const imagesReady = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route('**/attachment.svg*', async (route) => {
    if (route.request().resourceType() !== 'image') {
      await route.continue();

      return;
    }

    await imagesReady;
    await route.continue();
  });
  await page.goto('/playground/inbox.html');
  await page.getByRole('button', { name: 'Load attachments' }).click();
  await page.getByRole('button', { name: 'Load reading font' }).click();
  await page.getByRole('button', { name: 'Destroy inbox' }).click();
  release();
  await settle(page);
  await expect(page.getByRole('option')).toHaveCount(0);
  await expect(page.getByRole('main')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('brings a cached row back into view after its offscreen attachments change height', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 850, height: 650 });
  await page.goto('/playground/inbox.html');

  const list = page.getByRole('listbox', { name: 'Inbox messages' });
  const last = list.locator('[data-message-id="1999"]');
  await page.getByRole('button', { name: 'Last message' }).click();
  await expect(last).toBeInViewport();
  await settle(page);
  await list.focus();
  await page.keyboard.press('Home');
  await expect(list.locator('[data-message-id="0"]')).toBeInViewport();
  await page.getByRole('button', { name: 'Load attachments' }).click();
  await expect(list.locator('[data-message-id="0"] [data-loaded="true"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Last message' }).click();
  await expect(last.locator('[data-loaded="true"]')).toHaveCount(1);
  await settle(page);
  await expect(last).toBeInViewport();
  await expect(last).toHaveAttribute('aria-selected', 'true');
  expect(errors).toEqual([]);
});
