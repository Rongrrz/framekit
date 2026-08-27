import { describe, expect, it } from 'vitest';

import { fk } from '../..';
import { groupNode } from '../helpers/group-node';
import { resetDocumentAfterEach } from '../helpers/reset-document';

const {
  append,
  color3,
  createFrame,
  createTextLabel,
  createUICorner,
  createUIGlow,
  createUIScale,
  createUIShadow,
  createUIStroke,
  detach,
  destroy,
  isDestroyed,
  parent,
  props,
  update,
} = fk;

resetDocumentAfterEach();

describe('UI modifiers', () => {
  it('rejects invalid parent node roles', () => {
    const group = groupNode({ Name: 'Group' });
    const corner = createUICorner({ CornerRadius: 8 });
    expect(() => append(group, corner)).toThrow(/DOM-backed/);
    expect(parent(corner)).toBeUndefined();
    expect(() => append(corner, createFrame())).toThrow(/cannot contain child nodes/);
  });

  it('applies, updates, and removes corner and stroke styles through the tree', () => {
    const frame = createTextLabel();
    const corner = createUICorner({ CornerRadius: 12 });
    const stroke = createUIStroke({
      Color: color3(10, 20, 30),
      Thickness: 2,
      BorderStrokePosition: 'Inner',
    });
    append(frame, corner);
    append(frame, stroke);
    expect(frame.element.style.borderRadius).toBe('12px');
    expect(frame.element.style.boxShadow).toContain('inset');
    expect(frame.element.style.boxShadow).toContain('2px');

    update(corner, { CornerRadius: 18 });
    update(stroke, { BorderStrokePosition: 'Center', Thickness: 4 });
    expect(frame.element.style.borderRadius).toBe('18px');
    expect(frame.element.style.boxShadow).toContain('2px');

    update(corner, { Enabled: false });
    expect(frame.element.style.borderRadius).toBe('');
    update(corner, { Enabled: true });
    detach(corner);
    expect(frame.element.style.borderRadius).toBe('');
    append(frame, corner);
    destroy(frame);
    expect(isDestroyed(corner)).toBe(true);
    expect(isDestroyed(stroke)).toBe(true);
  });

  it('allows only one modifier of each kind per parent', () => {
    const frame = createTextLabel();
    const firstCorner = createUICorner({ CornerRadius: 4 });
    const secondCorner = createUICorner({ CornerRadius: 8 });
    append(frame, firstCorner);
    expect(() => append(frame, secondCorner)).toThrow(/already has a UICorner/);
    expect(parent(secondCorner)).toBeUndefined();
    expect(frame.element.style.borderRadius).toBe('4px');

    detach(firstCorner);
    append(frame, secondCorner);
    expect(frame.element.style.borderRadius).toBe('8px');

    const otherFrame = createTextLabel();
    append(otherFrame, firstCorner);
    expect(() => append(frame, firstCorner)).toThrow(/already has a UICorner/);
    expect(parent(firstCorner)).toBe(otherFrame);
    expect(otherFrame.element.style.borderRadius).toBe('4px');

    destroy(secondCorner);
    append(frame, firstCorner);
    expect(parent(firstCorner)).toBe(frame);
    expect(otherFrame.element.style.borderRadius).toBe('');
  });

  it('scales visually without changing requested size', () => {
    const frame = createFrame();
    const scale = createUIScale({ Scale: 1.1 });
    append(frame, scale);

    expect(frame.element.style.getPropertyValue('scale')).toBe('1.1');
    expect(props(frame).Size).toEqual(fk.udim2FromOffset(100, 100));

    update(scale, { Scale: 0.8 });
    expect(frame.element.style.getPropertyValue('scale')).toBe('0.8');
    expect(() => update(scale, { Scale: Number.NaN })).toThrow(/non-negative finite/);

    detach(scale);
    expect(frame.element.style.getPropertyValue('scale')).toBe('');
  });

  it('recomputes both parents when a modifier is moved', () => {
    const first = createTextLabel();
    const second = createTextLabel();
    const corner = createUICorner({ CornerRadius: 10 });
    append(first, corner);
    expect(first.element.style.borderRadius).toBe('10px');

    append(second, corner);
    expect(first.element.style.borderRadius).toBe('');
    expect(second.element.style.borderRadius).toBe('10px');
  });

  it('composes shadows, glows, and strokes without overwriting siblings', () => {
    const frame = createFrame();
    const stroke = createUIStroke({ Color: color3(255, 255, 255), Thickness: 2 });
    const shadow = createUIShadow({
      Color: color3(10, 20, 30),
      Offset: fk.vector2(4, 8),
      BlurRadius: 12,
    });
    const glow = createUIGlow({ Color: color3(100, 120, 255), Radius: 20 });
    append(frame, stroke);
    append(frame, shadow);
    append(frame, glow);

    expect(frame.element.style.boxShadow).toContain('0px 0px 0px 2px');
    expect(frame.element.style.boxShadow).toContain('4px 8px 12px 0px');
    expect(frame.element.style.filter).toContain('drop-shadow(0px 0px 7px');
    expect(frame.element.style.filter).toContain('drop-shadow(0px 0px 20px');

    update(shadow, { Offset: fk.vector2(-2, 6), BlurRadius: 18 });
    expect(frame.element.style.boxShadow).toContain('-2px 6px 18px 0px');
    detach(glow);
    expect(frame.element.style.filter).toBe('');
    expect(frame.element.style.boxShadow).toContain('-2px 6px 18px 0px');
    expect(frame.element.style.boxShadow).toContain('0px 0px 0px 2px');
  });

  it('validates shadow and glow geometry', () => {
    const frame = createFrame();
    const shadow = createUIShadow();
    const glow = createUIGlow();
    append(frame, shadow);
    append(frame, glow);

    expect(() => update(shadow, { BlurRadius: -1 })).toThrow(/BlurRadius/);
    expect(() => update(glow, { Radius: Number.NaN })).toThrow(/Radius/);
    expect(props(shadow).BlurRadius).toBe(16);
    expect(props(glow).Radius).toBe(18);
  });
});
