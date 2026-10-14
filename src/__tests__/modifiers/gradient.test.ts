import {
  color3FromRGB,
  colorSequence,
  createFrame,
  createTextButton,
  createTextLabel,
  createUIGradient,
  numberSequence,
  vector2,
} from 'framekit';
import { describe, expect, it } from 'vitest';

import { createDefaultGuiObjectProperties, createGuiObjectNode } from '#elements/gui-object.js';

import { resetDocumentAfterEach } from '../support/reset-document.js';

resetDocumentAfterEach();

describe('gradients', () => {
  it.each([createTextLabel, createTextButton])(
    'keeps text gradients active through text and paint edits (%#)',
    (createText) => {
      const label = createText({ Text: 'Before', TextColor3: color3FromRGB(255, 255, 255) });
      const gradient = createUIGradient({
        ApplyTo: 'Text',
        Color: colorSequence(color3FromRGB(255, 0, 0), color3FromRGB(0, 0, 255)),
      });
      gradient.Parent = label;
      const host = label.unsafeElement;
      const initialImage = host.style.getPropertyValue('--framekit-text-gradient-image');

      label.Text = 'After';
      expect(host.style.getPropertyValue('--framekit-text-gradient-image')).toBe(initialImage);
      expect(host.style.getPropertyValue('--framekit-text-gradient-fill')).toBe('transparent');

      label.setProperties({ TextTransparency: 0.5, TextSize: 24 });
      expect(host.style.getPropertyValue('--framekit-text-gradient-image')).toContain(
        'rgb(255 0 0 / 0.5)',
      );
      expect(host.style.getPropertyValue('--framekit-text-gradient-fill')).toBe('transparent');
      gradient.destroy();
      expect(host.style.getPropertyValue('--framekit-text-gradient-image')).toBe('none');
      expect(host.style.getPropertyValue('--framekit-text-gradient-fill')).toBe('currentcolor');
      label.destroy();
    },
  );

  it('applies color and transparency sequences through UIGradient', () => {
    const frame = createFrame({ BackgroundColor3: color3FromRGB(255, 255, 255) });
    const gradient = createUIGradient({
      Color: colorSequence(color3FromRGB(255, 0, 0), color3FromRGB(0, 0, 255)),
      Transparency: numberSequence(0, 0.5),
      Rotation: 0,
      Offset: vector2(0.1, 0),
    });

    gradient.Parent = frame;

    expect(frame.unsafeElement.style.backgroundImage).toContain('linear-gradient(90deg');
    expect(frame.unsafeElement.style.backgroundImage).toContain('rgb(255 0 0 / 1) 10%');
    expect(frame.unsafeElement.style.backgroundImage).toContain('rgb(0 0 255 / 0.5) 110%');
    expect(frame.unsafeElement.style.backgroundColor).toBe('transparent');

    gradient.Enabled = false;

    expect(frame.unsafeElement.style.backgroundImage).toBe('');
  });

  it('applies a UIGradient to text without reaching into its rendered span', () => {
    const label = createTextLabel({
      BackgroundColor3: color3FromRGB(20, 30, 40),
      Text: 'FrameKit',
      TextColor3: color3FromRGB(255, 255, 255),
    });
    const gradient = createUIGradient({
      ApplyTo: 'Text',
      Color: colorSequence(color3FromRGB(255, 0, 0), color3FromRGB(0, 0, 255)),
    });

    gradient.Parent = label;

    expect(label.unsafeElement.style.backgroundImage).toBe('');
    expect(label.unsafeElement.style.backgroundColor).not.toBe('transparent');
    expect(label.unsafeElement.style.getPropertyValue('--framekit-text-gradient-image')).toContain(
      'linear-gradient(90deg',
    );
    expect(label.unsafeElement.style.getPropertyValue('--framekit-text-gradient-fill')).toBe(
      'transparent',
    );
    const renderedText = label.unsafeElement.querySelector<HTMLElement>('[data-framekit-text]');
    expect(renderedText?.style.backgroundClip).toBe('text');
    expect(renderedText?.style.getPropertyValue('-webkit-background-clip')).toBe('text');

    gradient.Enabled = false;

    expect(label.unsafeElement.style.getPropertyValue('--framekit-text-gradient-image')).toBe(
      'none',
    );
    expect(label.unsafeElement.style.getPropertyValue('--framekit-text-gradient-fill')).toBe(
      'currentcolor',
    );
  });

  it('rejects a text UIGradient on a non-text parent without changing either tree', () => {
    const frame = createFrame();
    const gradient = createUIGradient({ ApplyTo: 'Text' });

    expect(() => (gradient.Parent = frame)).toThrow(/TextLabel or TextButton/);
    expect(gradient.Parent).toBeUndefined();
    expect(frame.unsafeElement.style.getPropertyValue('--framekit-text-gradient-image')).toBe('');
  });

  it('does not infer text support from custom property names', () => {
    const textLikeNode = createGuiObjectNode({
      className: 'TextLikeNode',
      element: document.createElement('div'),
      defaultProperties: { ...createDefaultGuiObjectProperties(), Text: 'not a text renderer' },
      initialProperties: {},
    });
    const gradient = createUIGradient({ ApplyTo: 'Text' });

    expect(() => (gradient.Parent = textLikeNode)).toThrow(/TextLabel or TextButton/);
    expect(gradient.Parent).toBeUndefined();
  });

  it('rejects transparency sequence values outside the normalized range', () => {
    expect(() => createUIGradient({ Transparency: numberSequence(0, 1.1) })).toThrow(
      /between 0 and 1/,
    );
  });
});
