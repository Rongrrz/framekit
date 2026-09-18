import { describe, expect, it } from 'vitest';

import { fk } from '../../../index.js';
import { resetDocumentAfterEach } from '../../support/reset-document.js';

resetDocumentAfterEach();

describe('text strokes', () => {
  it('only attaches text strokes to text-capable GUI objects', () => {
    const frame = fk.createFrame();
    const stroke = fk.createUITextStroke();

    expect(() => (stroke.Parent = frame)).toThrow(/TextLabel or TextButton/);
    expect(stroke.Parent).toBeUndefined();
  });

  it('applies, updates, disables, and removes text strokes', () => {
    const label = fk.createTextLabel({ Text: 'FrameKit' });
    const stroke = fk.createUITextStroke({
      Color: fk.color3FromRGB(10, 20, 30),
      Transparency: 0.25,
      Thickness: 2,
    });

    stroke.Parent = label;

    expect(label.unsafeElement.style.getPropertyValue('--framekit-text-stroke-color')).toBe(
      'rgb(10 20 30 / 0.75)',
    );
    expect(label.unsafeElement.style.getPropertyValue('--framekit-text-stroke-content')).toBe(
      'attr(data-framekit-text-content)',
    );
    expect(label.unsafeElement.style.getPropertyValue('--framekit-text-stroke-width')).toBe('2px');
    expect(label.unsafeElement.querySelectorAll('[data-framekit-text-stroke]')).toHaveLength(0);

    stroke.setProperties({ Thickness: 3, Transparency: 0.5 });

    expect(label.unsafeElement.style.getPropertyValue('--framekit-text-stroke-color')).toBe(
      'rgb(10 20 30 / 0.5)',
    );
    expect(label.unsafeElement.style.getPropertyValue('--framekit-text-stroke-width')).toBe('3px');

    stroke.Enabled = false;

    expect(label.unsafeElement.style.getPropertyValue('--framekit-text-stroke-content')).toBe(
      'none',
    );
    expect(label.unsafeElement.style.getPropertyValue('--framekit-text-stroke-width')).toBe('0px');

    stroke.Enabled = true;
    stroke.Parent = undefined;

    expect(label.unsafeElement.style.getPropertyValue('--framekit-text-stroke-content')).toBe(
      'none',
    );
    expect(label.unsafeElement.style.getPropertyValue('--framekit-text-stroke-width')).toBe('0px');
  });
});
