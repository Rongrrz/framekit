import { createFrame, createUIStroke, createUIShadow, type BorderStrokeSide } from 'framekit';
import { describe, expect, it } from 'vitest';

describe('stroke edges', () => {
  it.each<[BorderStrokeSide, string, string]>([
    ['Top', 'inset 0px 4px', '0px -4px'],
    ['Right', 'inset -4px 0px', '4px 0px'],
    ['Bottom', 'inset 0px -4px', '0px 4px'],
    ['Left', 'inset 4px 0px', '-4px 0px'],
  ])('draws the %s edge on either side of the border', (BorderStrokeSide, inner, outer) => {
    const frame = createFrame();
    const stroke = createUIStroke({
      BorderStrokeSide,
      Thickness: 4,
      BorderStrokePosition: 'Inner',
    });
    stroke.Parent = frame;
    expect(frame.unsafeElement.style.boxShadow.startsWith(inner)).toBe(true);
    stroke.BorderStrokePosition = 'Outer';
    expect(frame.unsafeElement.style.boxShadow.startsWith(outer)).toBe(true);
    frame.destroy();
  });

  it('composes a centered edge with shadows and removes only its own paint', () => {
    const frame = createFrame();
    const stroke = createUIStroke({
      BorderStrokeSide: 'Left',
      Thickness: 4,
      BorderStrokePosition: 'Center',
    });
    const shadow = createUIShadow();
    shadow.Parent = frame;
    const original = frame.unsafeElement.style.boxShadow;
    stroke.Parent = frame;
    expect(frame.unsafeElement.style.boxShadow).toContain('inset 2px 0px');
    expect(frame.unsafeElement.style.boxShadow).toContain('-2px 0px');
    expect(() =>
      stroke.setProperties({ BorderStrokeSide: 'Diagonal', Thickness: 20 } as never),
    ).toThrow(/BorderStrokeSide/);
    expect(stroke.Thickness).toBe(4);
    stroke.destroy();
    expect(frame.unsafeElement.style.boxShadow).toBe(original);
    frame.destroy();
  });
});
