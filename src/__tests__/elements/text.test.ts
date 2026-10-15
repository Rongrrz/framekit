import {
  color3FromRGB,
  createTextArea,
  createTextButton,
  createTextInput,
  createTextLabel,
} from 'framekit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetDocumentAfterEach } from '../support/reset-document.js';

resetDocumentAfterEach();
afterEach(() => vi.unstubAllGlobals());

describe('text labels', () => {
  it.each([
    { Text: 42 },
    { TextColor3: { R: -1, G: 0, B: 0 } },
    { TextTransparency: 1.1 },
    { TextSize: -1 },
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
    let resizeText: ResizeObserverCallback | undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        public constructor(callback: ResizeObserverCallback) {
          resizeText = callback;
        }
        public observe(): void {}
        public disconnect(): void {}
        public unobserve(): void {}
      },
    );
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
    resizeText?.([], {} as ResizeObserver);

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
