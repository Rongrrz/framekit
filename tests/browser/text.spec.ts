import type { Instance } from 'framekit';

import { expect, openFrameKit, test } from './fixtures.js';

for (const multiline of [false, true]) {
  test(`native edits accept observer corrections and retain selection (multiline: ${multiline})`, async ({
    page,
  }) => {
    await openFrameKit(page);
    await page.evaluate((multiline) => {
      const { createScreenGui, createTextArea, createTextInput } = window.framekit;
      const root = createScreenGui();
      const input = (multiline ? createTextArea : createTextInput)({ AccessibleLabel: 'Editor' });
      input.Parent = root;
      const textNode: Instance<{ Name: string; Text: string }> = input;
      textNode.onPropertyChanged('Text', (text) => {
        if (text === 'REMOVE') {
          input.destroy();
        } else {
          input.Text = text.toUpperCase();
        }
      });
      root.mount('#root');
    }, multiline);

    const editor = page.getByRole('textbox', { name: 'Editor' });
    await editor.fill('edited');
    await expect(editor).toHaveValue('EDITED');
    await editor.press('ArrowLeft');
    await editor.press('X');
    await expect(editor).toHaveValue('EDITEXD');
    expect(await editor.evaluate((element) => (element as HTMLInputElement).selectionStart)).toBe(
      6,
    );
    await editor.fill('REMOVE');
    await expect(editor).toHaveCount(0);
  });
}

test('font fitting stays bounded when host CSS overrides the measured font', async ({ page }) => {
  await openFrameKit(page);

  const result = await page.evaluate(() => {
    const { createScreenGui, createTextLabel, udim2FromOffset } = window.framekit;
    const style = document.createElement('style');
    style.textContent = '[data-framekit-text] { font-size: 1px !important; }';
    document.head.append(style);

    const gui = createScreenGui();
    const label = createTextLabel({ Text: 'Overridden font', Size: udim2FromOffset(4000, 4000) });
    label.Parent = gui;
    gui.mount('#root');

    const text = label.unsafeElement.querySelector<HTMLElement>('[data-framekit-text]')!;
    const scrollWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollWidth')!.get!;
    let measurements = 0;
    Object.defineProperty(text, 'scrollWidth', {
      get: () => {
        if (++measurements > 128) {
          throw new Error('Font fitting exceeded its measurement budget.');
        }

        return scrollWidth.call(text);
      },
    });

    try {
      label.TextScaled = true;

      return {
        measurements,
        declaredSize: text.style.fontSize,
        computedSize: getComputedStyle(text).fontSize,
      };
    } finally {
      gui.destroy();
      style.remove();
    }
  });

  expect(result.declaredSize).toBe('4000px');
  expect(result.computedSize).toBe('1px');
  expect(result.measurements).toBeLessThan(128);
});

test('text paint and outline survive edits and restore their defaults when removed', async ({
  page,
}) => {
  await openFrameKit(page);

  const result = await page.evaluate(() => {
    const { createScreenGui, createTextLabel, createUIGradient, createUITextStroke } =
      window.framekit;

    const gui = createScreenGui();
    const label = createTextLabel({ Text: 'Before' });
    label.Parent = gui;

    const gradient = createUIGradient({ ApplyTo: 'Text' });
    const stroke = createUITextStroke({ Thickness: 2 });
    gradient.Parent = label;
    stroke.Parent = label;
    gui.mount('#root');
    label.setProperties({ Text: 'After', TextSize: 24, FontFamily: 'monospace' });

    const host = label.unsafeElement;
    const text = host.querySelector<HTMLElement>('[data-framekit-text]')!;
    const outline = getComputedStyle(host, '::before');

    const active = {
      text: text.textContent,
      fill: getComputedStyle(text).webkitTextFillColor,
      gradient: getComputedStyle(text).backgroundImage,
      outline: outline.content,
      width: outline.webkitTextStrokeWidth,
      font: outline.fontSize,
    };

    gradient.destroy();
    stroke.destroy();

    const removed = {
      fill: getComputedStyle(text).webkitTextFillColor,
      gradient: getComputedStyle(text).backgroundImage,
      outline: getComputedStyle(host, '::before').content,
    };

    gui.destroy();

    return { active, removed };
  });

  expect(result.active.text).toBe('After');
  expect(result.active.fill).toBe('rgba(0, 0, 0, 0)');
  expect(result.active.gradient).toContain('linear-gradient');
  expect(result.active.outline).toContain('After');
  expect(result.active.width).toBe('2px');
  expect(result.active.font).toBe('24px');
  expect(result.removed).toEqual({ fill: 'rgb(0, 0, 0)', gradient: 'none', outline: 'none' });
});

test('scaled text still fits after resize and restores its explicit size when disabled', async ({
  page,
}) => {
  await openFrameKit(page);

  const result = await page.evaluate(async () => {
    const { createScreenGui, createTextLabel, udim2FromOffset } = window.framekit;
    const gui = createScreenGui();

    const label = createTextLabel({
      Text: 'Example label',
      TextScaled: true,
      TextSize: 19,
      FontFamily: 'monospace',
      Size: udim2FromOffset(200, 40),
    });

    label.Parent = gui;
    gui.mount('#root');

    const text = label.unsafeElement.querySelector<HTMLElement>('[data-framekit-text]')!;

    const settle = () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

    await settle();

    const large = Number.parseInt(text.style.fontSize, 10);
    label.Size = udim2FromOffset(100, 40);
    await settle();

    const small = Number.parseInt(text.style.fontSize, 10);

    const fits =
      text.scrollWidth <= text.clientWidth + 1 && text.scrollHeight <= text.clientHeight + 1;

    label.TextScaled = false;
    label.Text = 'Updated without scaling';

    const explicit = text.style.fontSize;
    label.Text = '';
    label.TextScaled = true;

    const empty = text.style.fontSize;
    gui.destroy();

    return { large, small, fits, explicit, empty };
  });

  expect(result.small).toBeGreaterThan(0);
  expect(result.large).toBeGreaterThan(result.small);
  expect(result.fits).toBe(true);
  expect(result.explicit).toBe('19px');
  expect(result.empty).toBe('19px');
});
