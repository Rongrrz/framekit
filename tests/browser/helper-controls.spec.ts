import { expect, openFrameKit, test } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await openFrameKit(page);
  await page.evaluate(() => {
    const {
      bindCheckbox,
      bindSlider,
      bindTabs,
      createScreenGui,
      createFrame,
      createTextButton,
      createTextInput,
      createObservableValue,
      watchOwnedValue,
      udim2FromOffset,
    } = window.framekit;
    const gui = createScreenGui();
    const checkbox = createTextButton({ Text: 'Enable shadows', Size: udim2FromOffset(180, 40) });
    checkbox.Parent = gui;
    const checked = createObservableValue(false);
    const stopCheckbox = bindCheckbox(checkbox, checked);

    const track = createFrame({
      Position: udim2FromOffset(40, 90),
      Size: udim2FromOffset(200, 20),
    });
    track.Parent = gui;
    const thumb = createTextButton({
      AccessibleLabel: 'Volume',
      Text: '',
      Size: udim2FromOffset(24, 32),
    });
    thumb.Parent = track;
    const value = createObservableValue(25);
    const stopSlider = bindSlider(track, thumb, { value, step: 5 });

    const vertical = createFrame({
      Position: udim2FromOffset(300, 60),
      Size: udim2FromOffset(20, 200),
    });
    vertical.Parent = gui;
    const verticalThumb = createTextButton({
      AccessibleLabel: 'Brightness',
      Text: '',
      Size: udim2FromOffset(32, 24),
    });
    verticalThumb.Parent = vertical;
    const stopVertical = bindSlider(vertical, verticalThumb, {
      value: createObservableValue(50),
      orientation: 'Vertical',
    });

    const tablist = createFrame({
      Position: udim2FromOffset(40, 300),
      Size: udim2FromOffset(330, 40),
    });
    tablist.Parent = gui;
    const items = ['General', 'Unavailable', 'Advanced'].map((key, index) => {
      const tab = createTextButton({
        Text: key,
        Disabled: index === 1,
        Position: udim2FromOffset(index * 110, 0),
        Size: udim2FromOffset(110, 40),
      });
      tab.Parent = tablist;
      const panel = createFrame({
        Position: udim2FromOffset(40, 350),
        Size: udim2FromOffset(330, 80),
      });
      panel.Parent = gui;
      const input = createTextInput({
        Text: `${key} draft`,
        AccessibleLabel: `${key} draft`,
        Size: udim2FromOffset(200, 40),
      });
      input.Parent = panel;

      return { key, tab, panel };
    });
    const selection = createObservableValue('General');
    const stopTabs = bindTabs(tablist, items, { selection });

    watchOwnedValue(gui, checked, (value) => {
      gui.unsafeElement.dataset.checked = String(value);
    });
    watchOwnedValue(gui, value, (value) => {
      gui.unsafeElement.dataset.value = String(value);
    });
    const release = createTextButton({
      Text: 'Release helpers',
      Position: udim2FromOffset(40, 450),
    });
    release.Parent = gui;
    release.onClick(() => {
      stopCheckbox();
      stopSlider();
      stopVertical();
      stopTabs();
    });
    const disable = createTextButton({
      Text: 'Disable controls',
      Position: udim2FromOffset(200, 450),
    });
    disable.Parent = gui;
    disable.onClick(() => {
      checkbox.Disabled = true;
      thumb.Disabled = true;
    });
    const resize = createTextButton({ Text: 'Resize track', Position: udim2FromOffset(360, 450) });
    resize.Parent = gui;
    resize.onClick(() => {
      vertical.Size = udim2FromOffset(20, 300);
    });
    const select = createTextButton({
      Text: 'Select advanced',
      Position: udim2FromOffset(480, 450),
    });
    select.Parent = gui;
    select.onClick(() => {
      selection.set('Advanced');
    });
    gui.mount('#root');
  });
});

test('checkbox uses native button keyboard activation exactly once and exposes checked state', async ({
  page,
}) => {
  const checkbox = page.getByRole('checkbox', { name: 'Enable shadows' });
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(checkbox).toBeChecked();
  await page.keyboard.press('Enter');
  await expect(checkbox).not.toBeChecked();
  await checkbox.click();
  await expect(checkbox).toBeChecked();
  await page.getByRole('button', { name: 'Disable controls' }).click();
  await expect(checkbox).toBeDisabled();
  await expect(checkbox).toHaveAttribute('aria-disabled', 'true');
});

test('slider supports stepped keyboard input, track clicks, and dragging past its bounds', async ({
  page,
}) => {
  const slider = page.getByRole('slider', { name: 'Volume' });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuenow', '30');
  await page.keyboard.press('PageUp');
  await expect(slider).toHaveAttribute('aria-valuenow', '80');
  await page.keyboard.press('End');
  await expect(slider).toHaveAttribute('aria-valuenow', '100');
  await page.mouse.click(140, 100);
  await expect(slider).toHaveAttribute('aria-valuenow', '50');
  await expect(slider).toBeFocused();
  const bounds = (await slider.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2 + 5, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await expect(slider).toHaveAttribute('aria-valuenow', '50');
  await page.mouse.move(500, 100);
  await page.mouse.up();
  await expect(slider).toHaveAttribute('aria-valuenow', '100');
  await page.getByRole('button', { name: 'Disable controls' }).click();
  await page.mouse.click(40, 100);
  await expect(slider).toHaveAttribute('aria-valuenow', '100');
});

test('vertical sliders increase upwards and keep their geometry after resizing', async ({
  page,
}) => {
  const slider = page.getByRole('slider', { name: 'Brightness' });
  await page.mouse.click(310, 110);
  await expect(slider).toHaveAttribute('aria-valuenow', '75');
  await slider.focus();
  await page.keyboard.press('ArrowUp');
  await expect(slider).toHaveAttribute('aria-valuenow', '76');
  await page.keyboard.press('Home');
  await expect(slider).toHaveAttribute('aria-valuenow', '0');
  await page.getByRole('button', { name: 'Resize track' }).click();
  const bounds = (await slider.boundingBox())!;
  expect(bounds.y + bounds.height / 2).toBeCloseTo(360, 0);
  await page.mouse.click(310, 60);
  await expect(slider).toHaveAttribute('aria-valuenow', '100');
});

test('tabs skip disabled controls, wrap selection, preserve drafts, and expose panel relationships', async ({
  page,
}) => {
  const general = page.getByRole('tab', { name: 'General', exact: true });
  const advanced = page.getByRole('tab', { name: 'Advanced', exact: true });
  const draft = page.getByRole('textbox', { name: 'General draft' });
  await draft.fill('persistent edit');
  await general.focus();
  await page.keyboard.press('ArrowRight');
  await expect(advanced).toBeFocused();
  await expect(advanced).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: 'Advanced', exact: true })).toBeVisible();
  await expect(draft).toBeHidden();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tabpanel', { name: 'Advanced', exact: true })).toBeFocused();
  await general.click();
  await expect(draft).toHaveValue('persistent edit');
  await general.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(advanced).toBeFocused();
  await page.keyboard.press('Home');
  await expect(general).toBeFocused();
});

test('disposing helpers restores ordinary buttons and frames without removing caller content', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Release helpers' }).click();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByRole('slider')).toHaveCount(0);
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enable shadows' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Volume' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'General draft' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Advanced draft' })).toBeVisible();
});

test('programmatic tab changes recover focus from hidden content without stealing outside focus', async ({
  page,
}) => {
  await page.getByRole('textbox', { name: 'General draft' }).focus();
  const select = page.getByRole('button', { name: 'Select advanced' });
  await select.evaluate((node: HTMLButtonElement) => node.click());
  await expect(page.getByRole('tab', { name: 'Advanced', exact: true })).toBeFocused();
  await page.getByRole('tab', { name: 'General', exact: true }).click();
  await select.focus();
  await select.evaluate((node: HTMLButtonElement) => node.click());
  await expect(select).toBeFocused();
});

test('cancelling a drag releases capture and stops subsequent movement', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Volume' });
  const bounds = (await slider.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(140, 100);
  await expect(slider).toHaveAttribute('aria-valuenow', '50');
  await slider.evaluate((node: HTMLElement) => {
    node.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true }));
  });
  await page.mouse.move(240, 100);
  await page.mouse.up();
  await expect(slider).toHaveAttribute('aria-valuenow', '50');
});
