import { expect, openFrameKit, test } from './fixtures.js';

test('inherits keyboard focus decoration, updates it live, and restores ancestor decoration', async ({
  page,
}) => {
  await openFrameKit(page);
  await page.evaluate(() => {
    const { createFrame, createTextButton, createUIListLayout, createUIFocusRing, color3FromRGB } =
      window.framekit;
    const root = createFrame();
    const ring = createUIFocusRing({ Color: color3FromRGB(0, 100, 200) });
    ring.Parent = root;
    createUIListLayout().Parent = root;
    const change = createTextButton({ Text: 'Change ring' });
    change.Parent = root;
    change.onClick(() => {
      ring.Color = color3FromRGB(200, 50, 0);
    });
    const group = createFrame();
    group.Parent = root;
    const local = createUIFocusRing({ Color: color3FromRGB(0, 200, 100), Thickness: 4, Offset: 1 });
    local.Parent = group;
    const release = createTextButton({ Text: 'Release local ring' });
    release.Parent = group;
    release.onClick(() => local.destroy());
    document.getElementById('root')!.append(root.unsafeElement);
  });

  const change = page.getByRole('button', { name: 'Change ring' });
  await change.click();
  expect(await change.evaluate((element) => element.matches(':focus-visible'))).toBe(false);
  await change.focus();
  await page.keyboard.press('Tab');
  const release = page.getByRole('button', { name: 'Release local ring' });
  // Safari's default Tab policy skips buttons; programmatic keyboard focus shares the ring.
  await release.focus();
  await expect(release).toBeFocused();
  await expect(release).toHaveCSS('outline-color', 'rgb(0, 200, 100)');
  await expect(release).toHaveCSS('outline-width', '4px');
  await expect(release).toHaveCSS('outline-offset', '1px');
  await page.keyboard.press('Enter');
  await expect(release).toBeFocused();
  await expect(release).toHaveCSS('outline-color', 'rgb(200, 50, 0)');
  await expect(release).toHaveCSS('outline-width', '2px');
  await expect(release).toHaveCSS('outline-offset', '3px');
});
