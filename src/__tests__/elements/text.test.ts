import {
  color3FromRGB,
  createTextArea,
  createTextButton,
  createTextInput,
  createTextLabel,
} from 'framekit';
import { describe, expect, it, vi } from 'vitest';

import { installResizeObserver } from '../support/resize-observer.js';

describe('text labels', () => {
  it.each([1234, 10_000_000])(
    'bounds font-fitting work when the estimate is far from the fitting size %i',
    (maximumFit) => {
      const ownerDocument = document.implementation.createHTMLDocument();

      const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        font: '',
        measureText: () => ({ width: 100 }),
      } as unknown as CanvasRenderingContext2D);

      const label = createTextLabel({ Text: 'Estimate mismatch' }, { ownerDocument });
      const text = label.unsafeElement.querySelector<HTMLElement>('[data-framekit-text]')!;
      let measurements = 0;
      Object.defineProperties(text, {
        clientWidth: { value: 10_000_000 },
        clientHeight: { value: 10_000_000 },
        scrollHeight: { value: 1 },
        scrollWidth: {
          get: () => {
            if (++measurements > 128) {
              throw new Error('Font fitting exceeded its measurement budget.');
            }

            return Number.parseInt(text.style.fontSize, 10) <= maximumFit ? 1 : 20_000_000;
          },
        },
      });

      try {
        expect(() => (label.TextScaled = true)).not.toThrow();
        expect(text.style.fontSize).toBe(`${maximumFit}px`);
        expect(measurements).toBeLessThan(128);
      } finally {
        label.destroy();
        canvas.mockRestore();
      }
    },
  );

  it.each([
    { Text: 42 },
    { TextColor3: { R: -1, G: 0, B: 0 } },
    { TextTransparency: 1.1 },
    { TextSize: -1 },
    { LineHeight: 0 },
    { LineHeight: Infinity },
    { LetterSpacing: NaN },
    { TextScaled: 'yes' },
    { TextWrapped: 'yes' },
    { TextXAlignment: 'sideways' },
    { TextYAlignment: 'sideways' },
    { FontFamily: 42 },
    { FontWeight: -1 },
  ])('rejects invalid typography in constructors and atomic updates: %j', (patch) => {
    const message = new RegExp(Object.keys(patch)[0]!);

    for (const createText of [createTextLabel, createTextButton, createTextInput, createTextArea]) {
      expect(() => createText(patch as never)).toThrow(message);

      const node = createText({ Text: 'Before' });
      expect(() => node.setProperties({ ...patch, Rotation: 45 } as never)).toThrow(message);
      expect(node.Text).toBe('Before');
      expect(node.Rotation).toBe(0);
      node.destroy();
    }
  });

  it.each([createTextLabel, createTextButton, createTextInput, createTextArea])(
    'updates fixed-size text without requiring layout measurements (%#)',
    (createText) => {
      const node = createText({ Text: 'Before', TextSize: 18 });

      const text =
        node.unsafeElement.querySelector<HTMLElement>('[data-framekit-text]') ?? node.unsafeElement;

      for (const property of ['clientWidth', 'clientHeight', 'scrollWidth', 'scrollHeight']) {
        Object.defineProperty(text, property, {
          get: () => {
            throw new Error('Fixed-size text must not require layout.');
          },
        });
      }

      node.setProperties({ Text: 'After', TextSize: 24, TextWrapped: true });
      node.FontFamily = 'monospace';

      expect(node.Text).toBe('After');
      expect(text.style.fontSize).toBe('24px');
      expect(text.style.whiteSpace).toBe('pre-wrap');
      node.destroy();
    },
  );

  it('uses the configured size for empty scaled text without measuring it', () => {
    const label = createTextLabel({ Text: '', TextScaled: true });
    const text = label.unsafeElement.querySelector<HTMLElement>('[data-framekit-text]')!;
    Object.defineProperty(text, 'clientWidth', {
      get: () => {
        throw new Error('Empty text does not need measurement.');
      },
    });

    label.TextSize = 24;

    expect(text.style.fontSize).toBe('24px');
    label.destroy();
  });

  it('uses a creation-only semantic text tag', () => {
    const defaultLabel = createTextLabel({ Text: 'Plain' });
    const heading = createTextLabel({ Text: 'Inventory', TextTagName: 'h1' });

    expect(defaultLabel.unsafeElement.querySelector('[data-framekit-text]')?.tagName).toBe('SPAN');
    expect(heading.unsafeElement.querySelector('[data-framekit-text]')?.tagName).toBe('H1');
    expect(() => createTextLabel({ TextTagName: 'script' } as never)).toThrow(/TextTagName/);
    expect(() => heading.setProperties({ TextTagName: 'h2' } as never)).toThrow(/Unknown property/);
  });

  it('synchronizes text properties without replacing node children', () => {
    const label = createTextLabel();
    const child = createTextLabel();

    child.Parent = label;
    label.setProperties({
      Text: 'Inventory',
      TextColor3: color3FromRGB(10, 20, 30),
      TextSize: 24,
      TextWrapped: true,
      TextXAlignment: 'Left',
    });

    const text = label.unsafeElement.querySelector<HTMLElement>('[data-framekit-text]');

    expect(text?.textContent).toBe('Inventory');
    expect(text?.style.fontSize).toBe('24px');
    expect(label.unsafeElement.dataset.framekitTextContent).toBe('Inventory');
    expect(label.unsafeElement.querySelectorAll('[data-framekit-text-stroke]')).toHaveLength(0);
    expect(text?.style.whiteSpace).toBe('pre-wrap');
    expect(label.unsafeElement.contains(child.unsafeElement)).toBe(true);
  });

  it('scales text to the largest whole-pixel size that fits its bounds', () => {
    let availableWidth = 100;
    const resizeText = installResizeObserver();

    const label = createTextLabel({ Text: 'Scale me', TextSize: 24 });
    const text = label.unsafeElement.querySelector<HTMLElement>('[data-framekit-text]')!;
    Object.defineProperties(text, {
      clientWidth: { configurable: true, get: () => availableWidth },
      clientHeight: { configurable: true, value: 40 },
      scrollWidth: {
        configurable: true,
        get: () => Number.parseInt(text.style.fontSize, 10) * 5,
      },
      scrollHeight: {
        configurable: true,
        get: () => Number.parseInt(text.style.fontSize, 10),
      },
    });

    expect(label.TextScaled).toBe(false);
    expect(text.style.fontSize).toBe('24px');

    label.TextScaled = true;

    expect(text.style.fontSize).toBe('20px');
    expect(label.unsafeElement.style.fontSize).toBe('20px');

    availableWidth = 50;
    resizeText();

    expect(text.style.fontSize).toBe('10px');

    label.TextScaled = false;

    expect(text.style.fontSize).toBe('24px');
  });

  it('rejects invalid TextScaled values without changing the rendered size', () => {
    const label = createTextLabel({ Text: 'Inventory', TextSize: 18 });
    const text = label.unsafeElement.querySelector<HTMLElement>('[data-framekit-text]')!;

    expect(() => label.setProperties({ TextScaled: 'yes' } as never)).toThrow(
      /TextScaled must be a boolean/,
    );
    expect(label.TextScaled).toBe(false);
    expect(text.style.fontSize).toBe('18px');
  });
});

it('lets automatic text participate in intrinsic layout and restores the fixed-size surface', () => {
  const label = createTextLabel({ Text: 'Wrapped content', TextWrapped: true, AutomaticSize: 'Y' });
  const text = label.unsafeElement.querySelector<HTMLElement>('[data-framekit-text]')!;
  expect(text.style.position).toBe('relative');
  expect(label.unsafeElement.style.height).toBe('auto');
  label.AutomaticSize = 'None';
  expect(text.style.position).toBe('absolute');
  expect(label.unsafeElement.style.height).toBe('100px');
  label.destroy();
});
