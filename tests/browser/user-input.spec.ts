import { expect, test } from '@playwright/test';

import type {} from './harness.js';

test('separates focused control keys from application input and preserves text editing', async ({
  page,
}) => {
  await page.goto('/tests/browser/index.html');
  await page.waitForFunction(() => Boolean(window.framekit));
  await page.evaluate(() => {
    const {
      createScreenGui,
      createTextButton,
      createTextInput,
      createUserInputService,
      udim2FromOffset,
    } = window.framekit;
    const app = createScreenGui();
    app.unsafeElement.id = 'input-app';
    const save = createTextButton({ Text: 'Save', Size: udim2FromOffset(160, 40) });
    const other = createTextButton({
      Text: 'Other',
      Position: udim2FromOffset(0, 60),
      Size: udim2FromOffset(160, 40),
    });
    const field = createTextInput({
      AccessibleLabel: 'Name',
      Position: udim2FromOffset(0, 120),
      Size: udim2FromOffset(160, 40),
    });
    save.Parent = app;
    other.Parent = app;
    field.Parent = app;
    let localCount = 0;
    let globalCount = 0;
    save.on('keydown', (event) => {
      if (event.key === 'k') {
        localCount += 1;
        app.unsafeElement.dataset.localCount = String(localCount);
        event.preventDefault();
      }
    });
    const input = createUserInputService(app);
    input.inputBegan.subscribe((event, processed) => {
      if (event.code === 'KeyK') {
        app.unsafeElement.dataset.processed = String(processed);
        app.unsafeElement.dataset.held = String(input.isKeyDown('KeyK'));
        if (!processed) {
          globalCount += 1;
        }
        app.unsafeElement.dataset.globalCount = String(globalCount);
      }
    });
    input.inputEnded.subscribe((event) => {
      if (event.code === 'KeyK') {
        app.unsafeElement.dataset.held = String(input.isKeyDown('KeyK'));
      }
    });
    other.onClick(() => app.destroy());
    app.mount('#root');
  });
  const app = page.locator('#input-app');
  const save = page.getByRole('button', { name: 'Save', exact: true });
  const other = page.getByRole('button', { name: 'Other', exact: true });
  await other.focus();
  await save.hover();
  await page.keyboard.down('k');
  await expect(app).toHaveAttribute('data-global-count', '1');
  await expect(app).toHaveAttribute('data-held', 'true');
  await expect(app).not.toHaveAttribute('data-local-count');
  await page.keyboard.up('k');
  await expect(app).toHaveAttribute('data-held', 'false');
  await save.focus();
  await page.keyboard.press('k');
  await expect(app).toHaveAttribute('data-local-count', '1');
  await expect(app).toHaveAttribute('data-global-count', '1');
  await expect(app).toHaveAttribute('data-processed', 'true');
  const field = page.getByRole('textbox', { name: 'Name' });
  await field.focus();
  await page.keyboard.press('k');
  await expect(field).toHaveValue('k');
  await expect(app).toHaveAttribute('data-global-count', '1');
  await expect(app).toHaveAttribute('data-processed', 'true');
  await other.click();
  await page.keyboard.press('k');
  await expect(app).toHaveCount(0);
});
