import {
  createFrame,
  createUIListLayout,
  createUISizeConstraint,
  udim2FromOffset,
  vector2,
} from 'framekit';
import { describe, expect, it } from 'vitest';

describe('UI size constraints', () => {
  it('preserves preferred size and restores unconstrained bounds when removed', () => {
    const row = createFrame();
    createUIListLayout({ FillDirection: 'Horizontal' }).Parent = row;
    const frame = createFrame({ Size: udim2FromOffset(400, 200) });
    frame.Parent = row;
    const bounds = createUISizeConstraint({ MinSize: vector2(100, 30), MaxSize: vector2(240, 90) });
    bounds.Parent = frame;

    expect(bounds.isA('UISizeConstraint')).toBe(true);
    expect(frame.Size).toEqual(udim2FromOffset(400, 200));
    expect(frame.unsafeElement.style.minWidth).toBe('100px');
    expect(frame.unsafeElement.style.maxWidth).toBe('240px');
    frame.Size = udim2FromOffset(500, 300);
    bounds.MaxSize = vector2(300, 100);
    expect(frame.unsafeElement.style.maxHeight).toBe('100px');
    expect(frame.unsafeElement.style.width).toBe('500px');
    bounds.destroy();
    expect(parseFloat(frame.unsafeElement.style.minWidth)).toBe(0);
    expect(frame.unsafeElement.style.maxWidth).toBe('');
    row.destroy();
  });

  it.each([
    { MinSize: { X: -1, Y: 0 } },
    { MaxSize: { X: NaN, Y: 0 } },
    { MinSize: vector2(100, 0), MaxSize: vector2(50, 0) },
  ])('rejects invalid bounds atomically: %j', (patch) => {
    expect(() => createUISizeConstraint(patch)).toThrow(/Size/);
    const bounds = createUISizeConstraint();
    expect(() => bounds.setProperties({ ...patch, Name: 'Changed' })).toThrow(/Size/);
    expect(bounds.Name).toBe('UISizeConstraint');
    bounds.destroy();
  });
});
