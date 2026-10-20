import { expect, openFrameKit, test } from './fixtures.js';

test('rich text wraps, sizes, selects, and inherits selection colors without application styling', async ({
  page,
}, info) => {
  await openFrameKit(page);
  await page.evaluate(() => {
    const {
      createScreenGui,
      createTextLabel,
      createUITextSelection,
      createUIPadding,
      color3FromRGB,
      udim,
      udim2FromOffset,
    } = window.framekit;
    const gui = createScreenGui({ ColorScheme: 'Dark' });
    const selection = createUITextSelection({
      TextColor3: color3FromRGB(255, 255, 255),
      BackgroundColor3: color3FromRGB(20, 100, 180),
    });
    selection.Parent = gui;
    const label = createTextLabel({
      Name: 'Rich paragraph',
      Text: '<b>Ready <i>when you are.</i></b><br/><font color="#ff000080">A colorful second line that wraps onto more lines.</font>',
      RichText: true,
      TextSelectable: true,
      TextWrapped: true,
      TextXAlignment: 'Left',
      TextYAlignment: 'Top',
      Size: udim2FromOffset(220, 0),
      AutomaticSize: 'Y',
      FontFamily: 'monospace',
      TextSize: 16,
      LineHeight: 1.5,
    });
    label.unsafeElement.dataset.testid = 'rich-paragraph';
    createUIPadding({
      PaddingLeft: udim(0, 12),
      PaddingRight: udim(0, 12),
      PaddingTop: udim(0, 10),
      PaddingBottom: udim(0, 10),
    }).Parent = label;
    label.Parent = gui;
    gui.mount('#root');
  });
  const paragraph = page.getByTestId('rich-paragraph');
  await expect(paragraph).toHaveText(
    'Ready when you are.\nA colorful second line that wraps onto more lines.',
  );
  expect((await paragraph.boundingBox())!.height).toBeGreaterThan(3 * 24 + 20);
  expect(
    await paragraph.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
  ).toBe(true);
  await expect(paragraph.locator('b')).toHaveCSS('font-weight', '700');
  await expect(paragraph.locator('i')).toHaveCSS('font-style', 'italic');
  const colors = await paragraph
    .locator('span')
    .last()
    .evaluate((element) => ({
      color: getComputedStyle(element).color,
      fill: getComputedStyle(element).webkitTextFillColor,
      selection: getComputedStyle(element, '::selection').backgroundColor,
      selectedText: getComputedStyle(element, '::selection').color,
      scheme: getComputedStyle(element).colorScheme,
    }));
  expect(colors.fill).toBe(colors.color);
  const channels = colors.color.match(/[\d.]+/g)!.map(Number);
  expect(channels.slice(0, 3)).toEqual([255, 0, 0]);
  expect(channels[3]).toBeCloseTo(128 / 255, 2);
  expect(colors).toMatchObject({
    selection: 'rgb(20, 100, 180)',
    selectedText: 'rgb(255, 255, 255)',
    scheme: 'dark',
  });
  const selected = await paragraph.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    return selection.toString();
  });
  expect(selected).toBe('Ready when you are.\nA colorful second line that wraps onto more lines.');
  await paragraph.screenshot({ path: info.outputPath('rich-selection.png') });
});

test('scaled rich text composes with strokes and reversible text gradients', async ({
  page,
}, info) => {
  await openFrameKit(page);
  await page.evaluate(() => {
    const {
      createScreenGui,
      createTextLabel,
      createUITextStroke,
      createUIGradient,
      createTextButton,
      createUIPadding,
      colorSequence,
      color3FromRGB,
      udim,
      udim2FromOffset,
    } = window.framekit;
    const gui = createScreenGui();
    const label = createTextLabel({
      Text: '<b>Victory</b> <font color="#c80000"><i>today</i></font>',
      RichText: true,
      TextScaled: true,
      TextColor3: color3FromRGB(255, 255, 255),
      Size: udim2FromOffset(240, 80),
      FontFamily: 'monospace',
    });
    label.unsafeElement.dataset.testid = 'scaled-rich-text';
    createUIPadding({ PaddingLeft: udim(0, 12), PaddingRight: udim(0, 12) }).Parent = label;
    createUITextStroke({ Color: color3FromRGB(0, 0, 0), Thickness: 2 }).Parent = label;
    const gradient = createUIGradient({
      Enabled: false,
      ApplyTo: 'Text',
      Color: colorSequence(color3FromRGB(0, 100, 255), color3FromRGB(0, 220, 100)),
    });
    gradient.Parent = label;
    const toggle = createTextButton({ Text: 'Toggle gradient', Position: udim2FromOffset(260, 0) });
    toggle.onClick(() => {
      gradient.Enabled = !gradient.Enabled;
    });
    toggle.Parent = gui;
    label.Parent = gui;
    gui.mount('#root');
  });
  const label = page.getByTestId('scaled-rich-text');
  const geometry = await label.evaluate((element) => {
    const text = element.querySelector('[data-framekit-text]')!;
    const range = document.createRange();
    range.selectNodeContents(text);
    const rich = text.firstElementChild!;
    return {
      width: range.getBoundingClientRect().width,
      font: Number.parseFloat(getComputedStyle(text).fontSize),
      stroke: getComputedStyle(rich).webkitTextStrokeWidth,
    };
  });
  expect(geometry.width).toBeLessThanOrEqual(217);
  expect(geometry.font).toBeGreaterThan(20);
  expect(geometry.stroke).toBe('2px');
  await label.screenshot({ path: info.outputPath('rich-stroke.png') });
  await page.getByRole('button', { name: 'Toggle gradient' }).click();
  await expect(label.locator('i')).toHaveCSS('-webkit-text-fill-color', 'rgba(0, 0, 0, 0)');
  await expect(label.locator('[data-framekit-text]')).toHaveCSS(
    'background-image',
    /linear-gradient/,
  );
  await label.screenshot({ path: info.outputPath('rich-gradient.png') });
  await page.getByRole('button', { name: 'Toggle gradient' }).click();
  await expect(label.locator('i')).toHaveCSS('-webkit-text-fill-color', 'rgb(200, 0, 0)');
  await expect(label.locator('[data-framekit-text]')).toHaveCSS('background-image', 'none');
});
