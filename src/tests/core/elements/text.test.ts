import { afterEach, describe, expect, it, vi } from 'vitest';

import { fk } from '../../../index';
import { resetDocumentAfterEach } from '../../support/reset-document';

resetDocumentAfterEach();
afterEach(() => vi.unstubAllGlobals());

describe('text labels', () => {
  it('synchronizes text properties without replacing node children', () => {
    const label = fk.createTextLabel();
    const child = fk.createTextLabel();

    label.addChild(child);
    label.setProperties({
      Text: 'Inventory',
      TextColor3: fk.color3FromRGB(10, 20, 30),
      TextSize: 24,
      TextWrapped: true,
      TextXAlignment: 'Left',
    });

    const text = label.element.querySelector<HTMLElement>('[data-framekit-text]');

    expect(text?.textContent).toBe('Inventory');
    expect(text?.style.fontSize).toBe('24px');
    expect(label.element.dataset.framekitTextContent).toBe('Inventory');
    expect(label.element.querySelectorAll('[data-framekit-text-stroke]')).toHaveLength(0);
    expect(text?.style.whiteSpace).toBe('pre-wrap');
    expect(label.element.contains(child.element)).toBe(true);
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
    const label = fk.createTextLabel({ Text: 'Scale me', TextSize: 24 });
    const text = label.element.querySelector<HTMLElement>('[data-framekit-text]')!;
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
    expect(label.element.style.fontSize).toBe('20px');

    availableWidth = 50;
    resizeText?.([], {} as ResizeObserver);

    expect(text.style.fontSize).toBe('10px');

    label.TextScaled = false;

    expect(text.style.fontSize).toBe('24px');
  });

  it('rejects invalid TextScaled values without changing the rendered size', () => {
    const label = fk.createTextLabel({ Text: 'Inventory', TextSize: 18 });
    const text = label.element.querySelector<HTMLElement>('[data-framekit-text]')!;

    expect(() => label.setProperties({ TextScaled: 'yes' } as never)).toThrow(
      /TextScaled must be a boolean/,
    );
    expect(label.TextScaled).toBe(false);
    expect(text.style.fontSize).toBe('18px');
  });
});
