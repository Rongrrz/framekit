import {
  color3FromRGB,
  createFrame,
  createTextButton,
  createTextLabel,
  createUITextStroke,
} from 'framekit';
import { describe, expect, it } from 'vitest';

import { resetDocumentAfterEach } from '../support/reset-document.js';

resetDocumentAfterEach();

describe('text strokes', () => {
  it.each([createTextLabel, createTextButton])(
    'keeps the outline active through text and typography edits (%#)',
    (createText) => {
      const label = createText({ Text: 'Before' });
      const stroke = createUITextStroke({ Color: color3FromRGB(10, 20, 30), Thickness: 2 });
      stroke.Parent = label;

      label.Text = 'After';
      label.setProperties({ TextSize: 24, FontFamily: 'monospace', TextXAlignment: 'Left' });

      const host = label.unsafeElement;
      expect(host.dataset.framekitTextContent).toBe('After');
      expect(host.style.getPropertyValue('--framekit-text-stroke-content')).toBe(
        'attr(data-framekit-text-content)',
      );
      expect(host.style.getPropertyValue('--framekit-text-stroke-color')).toBe('rgb(10 20 30 / 1)');
      expect(host.style.getPropertyValue('--framekit-text-stroke-width')).toBe('2px');
      expect(host.style.fontSize).toBe('24px');

      stroke.Parent = undefined;
      expect(host.style.getPropertyValue('--framekit-text-stroke-content')).toBe('none');
      expect(host.style.getPropertyValue('--framekit-text-stroke-width')).toBe('0px');
      stroke.destroy();
      label.destroy();
    },
  );

  it('only attaches text strokes to text-capable GUI objects', () => {
    const frame = createFrame();
    const stroke = createUITextStroke();

    expect(() => (stroke.Parent = frame)).toThrow(/TextLabel or TextButton/);
    expect(stroke.Parent).toBeUndefined();
  });

  it('applies, updates, disables, and removes text strokes', () => {
    const label = createTextLabel({ Text: 'FrameKit' });
    const stroke = createUITextStroke({
      Color: color3FromRGB(10, 20, 30),
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
