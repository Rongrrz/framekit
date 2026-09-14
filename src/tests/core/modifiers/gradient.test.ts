import { describe, expect, it } from 'vitest';

import { fk } from '../../../index';
import { resetDocumentAfterEach } from '../../support/reset-document';

resetDocumentAfterEach();

describe('gradients', () => {
  it('applies color and transparency sequences through UIGradient', () => {
    const frame = fk.createFrame({ BackgroundColor3: fk.color3FromRGB(255, 255, 255) });
    const gradient = fk.createUIGradient({
      Color: fk.colorSequence(fk.color3FromRGB(255, 0, 0), fk.color3FromRGB(0, 0, 255)),
      Transparency: fk.numberSequence(0, 0.5),
      Rotation: 0,
      Offset: fk.vector2(0.1, 0),
    });

    frame.addChild(gradient);

    expect(frame.element.style.backgroundImage).toContain('linear-gradient(90deg');
    expect(frame.element.style.backgroundImage).toContain('rgb(255 0 0 / 1) 10%');
    expect(frame.element.style.backgroundImage).toContain('rgb(0 0 255 / 0.5) 110%');
    expect(frame.element.style.backgroundColor).toBe('transparent');

    gradient.Enabled = false;

    expect(frame.element.style.backgroundImage).toBe('');
  });

  it('applies a UIGradient to text without reaching into its rendered span', () => {
    const label = fk.createTextLabel({
      BackgroundColor3: fk.color3FromRGB(20, 30, 40),
      Text: 'FrameKit',
      TextColor3: fk.color3FromRGB(255, 255, 255),
    });
    const gradient = fk.createUIGradient({
      ApplyTo: 'Text',
      Color: fk.colorSequence(fk.color3FromRGB(255, 0, 0), fk.color3FromRGB(0, 0, 255)),
    });

    label.addChild(gradient);

    expect(label.element.style.backgroundImage).toBe('');
    expect(label.element.style.backgroundColor).not.toBe('transparent');
    expect(label.element.style.getPropertyValue('--framekit-text-gradient-image')).toContain(
      'linear-gradient(90deg',
    );
    expect(label.element.style.getPropertyValue('--framekit-text-gradient-fill')).toBe(
      'transparent',
    );
    const renderedText = label.element.querySelector<HTMLElement>('[data-framekit-text]');
    expect(renderedText?.style.backgroundClip).toBe('text');
    expect(renderedText?.style.getPropertyValue('-webkit-background-clip')).toBe('text');

    gradient.Enabled = false;

    expect(label.element.style.getPropertyValue('--framekit-text-gradient-image')).toBe('none');
    expect(label.element.style.getPropertyValue('--framekit-text-gradient-fill')).toBe(
      'currentcolor',
    );
  });

  it('rejects a text UIGradient on a non-text parent without changing either tree', () => {
    const frame = fk.createFrame();
    const gradient = fk.createUIGradient({ ApplyTo: 'Text' });

    expect(() => frame.addChild(gradient)).toThrow(/TextLabel or TextButton/);
    expect(gradient.Parent).toBeUndefined();
    expect(frame.element.style.getPropertyValue('--framekit-text-gradient-image')).toBe('');
  });

  it('does not infer text support from custom property names', () => {
    const createTextLikeNode = fk.defineGuiObject({
      className: 'TextLikeNode',
      defaultProperties: { Text: 'not a text renderer' },
    });
    const textLikeNode = createTextLikeNode();
    const gradient = fk.createUIGradient({ ApplyTo: 'Text' });

    expect(() => textLikeNode.addChild(gradient)).toThrow(/TextLabel or TextButton/);
    expect(gradient.Parent).toBeUndefined();
  });

  it('rejects transparency sequence values outside the normalized range', () => {
    expect(() => fk.createUIGradient({ Transparency: fk.numberSequence(0, 1.1) })).toThrow(
      /between 0 and 1/,
    );
  });
});
