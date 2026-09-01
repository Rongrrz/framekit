import { describe, expect, it } from 'vitest';

import { fk } from '../../..';
import { createStyleModifier } from '../../../shared/runtime/modifier';
import { groupNode } from '../../support/group-node';
import { resetDocumentAfterEach } from '../../support/reset-document';

const {
  color3FromRGB,
  createFrame,
  createTextLabel,
  createUICorner,
  createUIGradient,
  createUIScale,
  createUIShadow,
  createUIStroke,
  createUITextStroke,
} = fk;
resetDocumentAfterEach();

describe('UI modifiers', () => {
  it('rejects invalid parent node roles', () => {
    const group = groupNode({ Name: 'Group' });
    const corner = createUICorner({ CornerRadius: 8 });

    expect(() => group.addChild(corner)).toThrow(/DOM-backed/);
    expect(corner.Parent).toBeUndefined();
    expect(() => corner.addChild(createFrame())).toThrow(/cannot contain child nodes/);
  });

  it('only attaches text strokes to text-capable GUI objects', () => {
    const frame = createFrame();
    const stroke = createUITextStroke();

    expect(() => frame.addChild(stroke)).toThrow(/TextLabel or TextButton/);
    expect(stroke.Parent).toBeUndefined();
  });

  it('applies, updates, and removes corner and stroke styles through the tree', () => {
    const frame = createTextLabel();
    const corner = createUICorner({ CornerRadius: 12 });
    const stroke = createUIStroke({
      Color: color3FromRGB(10, 20, 30),
      Thickness: 2,
      BorderStrokePosition: 'Inner',
    });

    frame.addChild(corner);
    frame.addChild(stroke);

    expect(frame.element.style.borderRadius).toBe('12px');
    expect(frame.element.style.boxShadow).toContain('inset');
    expect(frame.element.style.boxShadow).toContain('2px');

    corner.setProperties({ CornerRadius: 18 });
    stroke.setProperties({ BorderStrokePosition: 'Center', Thickness: 4 });

    expect(frame.element.style.borderRadius).toBe('18px');
    expect(frame.element.style.boxShadow).toContain('2px');

    corner.setProperties({ Enabled: false });

    expect(frame.element.style.borderRadius).toBe('');

    corner.setProperties({ Enabled: true });
    corner.removeFromParent();

    expect(frame.element.style.borderRadius).toBe('');

    frame.addChild(corner);
    frame.destroy();

    expect(corner.isDestroyed()).toBe(true);
    expect(stroke.isDestroyed()).toBe(true);
  });

  it('allows only one modifier of each kind per parent', () => {
    const frame = createTextLabel();
    const firstCorner = createUICorner({ CornerRadius: 4 });
    const secondCorner = createUICorner({ CornerRadius: 8 });

    frame.addChild(firstCorner);

    expect(() => frame.addChild(secondCorner)).toThrow(/already has a UICorner/);
    expect(secondCorner.Parent).toBeUndefined();
    expect(frame.element.style.borderRadius).toBe('4px');

    firstCorner.removeFromParent();
    frame.addChild(secondCorner);

    expect(frame.element.style.borderRadius).toBe('8px');

    const otherFrame = createTextLabel();

    otherFrame.addChild(firstCorner);

    expect(() => frame.addChild(firstCorner)).toThrow(/already has a UICorner/);
    expect(firstCorner.Parent).toBe(otherFrame);
    expect(otherFrame.element.style.borderRadius).toBe('4px');

    secondCorner.destroy();
    frame.addChild(firstCorner);

    expect(firstCorner.Parent).toBe(frame);
    expect(otherFrame.element.style.borderRadius).toBe('');
  });

  it('scales visually without changing requested size', () => {
    const frame = createFrame();
    const scale = createUIScale({ Scale: 1.1 });

    frame.addChild(scale);

    expect(frame.element.style.getPropertyValue('scale')).toBe('1.1');
    expect(frame.Size).toEqual(fk.udim2FromOffset(100, 100));

    scale.setProperties({ Scale: 0.8 });

    expect(frame.element.style.getPropertyValue('scale')).toBe('0.8');
    expect(() => scale.setProperties({ Scale: Number.NaN })).toThrow(/finite/);

    scale.removeFromParent();

    expect(frame.element.style.getPropertyValue('scale')).toBe('');
  });

  it('recomputes both parents when a modifier is moved', () => {
    const first = createTextLabel();
    const second = createTextLabel();
    const corner = createUICorner({ CornerRadius: 10 });

    first.addChild(corner);

    expect(first.element.style.borderRadius).toBe('10px');

    second.addChild(corner);

    expect(first.element.style.borderRadius).toBe('');
    expect(second.element.style.borderRadius).toBe('10px');
  });

  it('composes shadows and strokes without overwriting siblings', () => {
    const frame = createFrame();
    const stroke = createUIStroke({ Color: color3FromRGB(255, 255, 255), Thickness: 2 });
    const shadow = createUIShadow({
      Color: color3FromRGB(10, 20, 30),
      Offset: fk.vector2(4, 8),
      BlurRadius: 12,
    });

    frame.addChild(stroke);
    frame.addChild(shadow);

    expect(frame.element.style.boxShadow).toContain('0px 0px 0px 2px');
    expect(frame.element.style.boxShadow).toContain('4px 8px 12px 0px');

    shadow.setProperties({ Offset: fk.vector2(-2, 6), BlurRadius: 18 });

    expect(frame.element.style.boxShadow).toContain('-2px 6px 18px 0px');

    expect(frame.element.style.boxShadow).toContain('-2px 6px 18px 0px');
    expect(frame.element.style.boxShadow).toContain('0px 0px 0px 2px');
  });

  it('applies, updates, disables, and removes text strokes', () => {
    const label = createTextLabel({ Text: 'FrameKit' });
    const stroke = createUITextStroke({
      Color: color3FromRGB(10, 20, 30),
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

  it('applies color and transparency sequences through UIGradient', () => {
    const frame = createFrame({ BackgroundColor3: fk.color3FromRGB(255, 255, 255) });
    const gradient = createUIGradient({
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
    const label = createTextLabel({
      BackgroundColor3: color3FromRGB(20, 30, 40),
      Text: 'FrameKit',
      TextColor3: color3FromRGB(255, 255, 255),
    });
    const gradient = createUIGradient({
      ApplyTo: 'Text',
      Color: fk.colorSequence(color3FromRGB(255, 0, 0), color3FromRGB(0, 0, 255)),
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
    expect(label.element.querySelectorAll('[data-framekit-text]')).toHaveLength(1);

    gradient.Enabled = false;

    expect(label.element.style.getPropertyValue('--framekit-text-gradient-image')).toBe('none');
    expect(label.element.style.getPropertyValue('--framekit-text-gradient-fill')).toBe(
      'currentcolor',
    );
  });

  it('rejects a text UIGradient on a non-text parent without changing either tree', () => {
    const frame = createFrame();
    const gradient = createUIGradient({ ApplyTo: 'Text' });

    expect(() => frame.addChild(gradient)).toThrow(/TextLabel or TextButton/);
    expect(gradient.Parent).toBeUndefined();
    expect(frame.element.style.getPropertyValue('--framekit-text-gradient-image')).toBe('');
  });

  it('validates shadow geometry', () => {
    const frame = createFrame();
    const shadow = createUIShadow();

    frame.addChild(shadow);

    expect(() => shadow.setProperties({ BlurRadius: -1 })).toThrow(/BlurRadius/);
    expect(shadow.BlurRadius).toBe(16);
  });

  it('rolls back a failed modifier append without corrupting its target', () => {
    const frame = createFrame({ Name: 'RejectedTarget' });
    const rejected = createStyleModifier('Rejected', { Name: 'Rejected' }, (_, target) => {
      if (target.Name === 'RejectedTarget') throw new Error('target rejected');
      return {};
    });

    expect(() => frame.addChild(rejected)).toThrow(/target rejected/);
    expect(rejected.Parent).toBeUndefined();

    const corner = createUICorner({ CornerRadius: 6 });

    frame.addChild(corner);

    expect(frame.element.style.borderRadius).toBe('6px');
  });

  it('rejects non-finite modifier properties at construction', () => {
    expect(() => createUIStroke({ Thickness: Number.NaN })).toThrow(/Thickness.*finite/);
    expect(() => createUICorner({ CornerRadius: Number.POSITIVE_INFINITY })).toThrow(
      /CornerRadius.*finite/,
    );
  });

  it('validates domain-specific modifier values while detached', () => {
    expect(() => createUIScale({ Scale: -1 })).toThrow(/non-negative finite/);
    expect(() => createUITextStroke({ Thickness: -1 })).toThrow(/non-negative finite/);

    const scale = createUIScale();

    expect(() => scale.setProperties({ Scale: -1 })).toThrow(/non-negative finite/);
    expect(scale.Scale).toBe(1);
  });
});
