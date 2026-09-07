import { describe, expect, it } from 'vitest';

import { fk } from '../../../index';
import { resetDocumentAfterEach } from '../../support/reset-document';

resetDocumentAfterEach();

describe('text strokes', () => {
  it('only attaches text strokes to text-capable GUI objects', () => {
    const frame = fk.createFrame();
    const stroke = fk.createUITextStroke();

    expect(() => frame.addChild(stroke)).toThrow(/TextLabel or TextButton/);
    expect(stroke.Parent).toBeUndefined();
  });

  it('applies, updates, disables, and removes text strokes', () => {
    const label = fk.createTextLabel({ Text: 'FrameKit' });
    const stroke = fk.createUITextStroke({
      Color: fk.color3FromRGB(10, 20, 30),
      Transparency: 0.25,
      Thickness: 2,
    });

    label.addChild(stroke);

    expect(label.element.style.getPropertyValue('--framekit-text-stroke-color')).toBe(
      'rgb(10 20 30 / 0.75)',
    );
    expect(label.element.style.getPropertyValue('--framekit-text-stroke-content')).toBe(
      'attr(data-framekit-text-content)',
    );
    expect(label.element.style.getPropertyValue('--framekit-text-stroke-width')).toBe('2px');
    expect(label.element.querySelectorAll('[data-framekit-text-stroke]')).toHaveLength(0);

    stroke.setProperties({ Thickness: 3, Transparency: 0.5 });

    expect(label.element.style.getPropertyValue('--framekit-text-stroke-color')).toBe(
      'rgb(10 20 30 / 0.5)',
    );
    expect(label.element.style.getPropertyValue('--framekit-text-stroke-width')).toBe('3px');

    stroke.Enabled = false;

    expect(label.element.style.getPropertyValue('--framekit-text-stroke-content')).toBe('none');
    expect(label.element.style.getPropertyValue('--framekit-text-stroke-width')).toBe('0px');

    stroke.Enabled = true;
    stroke.removeFromParent();

    expect(label.element.style.getPropertyValue('--framekit-text-stroke-content')).toBe('none');
    expect(label.element.style.getPropertyValue('--framekit-text-stroke-width')).toBe('0px');
  });
});
