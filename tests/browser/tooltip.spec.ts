import { expect, openFrameKit, test } from './fixtures.js';

for (const followCursor of [false, true]) {
  test(`keeps keyboard descriptions accessible without retaining pointer focus (followCursor: ${followCursor})`, async ({
    page,
  }) => {
    await openFrameKit(page);
    await page.evaluate((followCursor) => {
      const { createScreenGui, createTextButton, bindTooltip, udim2FromOffset } = window.framekit;
      const root = createScreenGui();
      const trigger = createTextButton({ Text: 'Help', Size: udim2FromOffset(120, 40) });

      const next = createTextButton({
        Text: 'Next',
        Position: udim2FromOffset(0, 100),
        Size: udim2FromOffset(120, 40),
      });

      // Explicit tab stops also work with macOS WebKit's keyboard navigation defaults.
      trigger.unsafeElement.tabIndex = 0;
      next.unsafeElement.tabIndex = 0;
      trigger.Parent = root;
      next.Parent = root;
      bindTooltip(trigger, 'Helpful description', { followCursor, delay: 50 });
      root.mount('#root');
    }, followCursor);

    const trigger = page.getByRole('button', { name: 'Help', exact: true });
    const tooltip = page.getByRole('tooltip');
    await page.mouse.move(500, 400);
    await page.keyboard.press('Tab');
    await expect(trigger).toBeFocused();
    await expect(tooltip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(tooltip).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tooltip).toBeHidden();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(tooltip).toBeVisible();

    // A pointer press on an already keyboard-focused button must release focus retention too.
    await trigger.click();
    await page.mouse.move(500, 400);
    await expect(tooltip).toBeHidden();
    await trigger.hover();
    await expect(tooltip).toBeVisible();
    await page.mouse.move(500, 400);
    await expect(tooltip).toBeHidden();
    // Switching back to the keyboard works even while the clicked button retains DOM focus.
    await page.keyboard.press('Space');
    await expect(tooltip).toBeVisible();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(trigger).toBeFocused();
    await expect(tooltip).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(tooltip).toBeHidden();
    // A consumer can prevent pointer focus; the next Tab must still reveal the description.
    await trigger.evaluate((element) =>
      element.addEventListener('pointerdown', (event) => event.preventDefault(), { once: true }),
    );
    await trigger.click();
    await page.mouse.move(500, 400);
    await expect(tooltip).toBeHidden();
    await page.keyboard.press('Shift+Tab');
    await expect(trigger).toBeFocused();
    await expect(tooltip).toBeVisible();
  });
}
