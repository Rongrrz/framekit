import { expect, openFrameKit, test } from './fixtures.js';

test('fades continuously, prevents interaction while hiding, and settles when reduced motion changes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openFrameKit(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.evaluate(() => {
    const {
      createCanvasGroup,
      createTextButton,
      createObservableValue,
      bindVisibility,
      udim2FromOffset,
    } = window.framekit;
    const group = createCanvasGroup();
    group.unsafeElement.dataset.testid = 'fading-group';
    const child = createTextButton({ Text: 'Faded command' });
    child.Parent = group;
    const visible = createObservableValue(false);
    bindVisibility(group, visible, { duration: 1 });
    const toggle = createTextButton({
      Text: 'Toggle visibility',
      Position: udim2FromOffset(200, 0),
    });
    toggle.onClick(() => visible.update((current) => !current));
    document.getElementById('root')!.append(group.unsafeElement, toggle.unsafeElement);
  });

  const group = page.getByTestId('fading-group');
  const toggle = page.getByRole('button', { name: 'Toggle visibility' });
  const command = page.getByRole('button', { name: 'Faded command', includeHidden: true });
  await expect(group).toBeHidden();
  await toggle.evaluate((element: HTMLButtonElement) => element.click());
  await page.clock.runFor(500);
  const halfway = await group.evaluate((element) => Number(getComputedStyle(element).opacity));
  expect(halfway).toBeGreaterThan(0.5);
  expect(halfway).toBeLessThan(1);
  await toggle.evaluate((element: HTMLButtonElement) => element.click());
  expect(await group.evaluate((element) => Number(getComputedStyle(element).opacity))).toBe(
    halfway,
  );
  await expect(group).toHaveAttribute('inert', '');
  await command.focus();
  await expect(command).not.toBeFocused();
  await page.clock.runFor(250);
  expect(await group.evaluate((element) => Number(getComputedStyle(element).opacity))).toBeLessThan(
    halfway,
  );
  await toggle.evaluate((element: HTMLButtonElement) => element.click());
  await page.clock.runFor(1100);
  await expect(group).toHaveCSS('opacity', '1');
  await command.focus();
  await expect(command).toBeFocused();

  await toggle.evaluate((element: HTMLButtonElement) => element.click());
  await page.clock.runFor(100);
  await expect(group).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(group).toBeHidden();
  await toggle.evaluate((element: HTMLButtonElement) => element.click());
  await expect(group).toBeVisible();
  await expect(group).toHaveCSS('opacity', '1');
});
