import { describe, expect, it } from 'vitest';

import { color3FromRGB, createFrame, createValue, spring, fk } from '..';

describe('package API', () => {
  it('supports both named imports and the fk namespace', () => {
    expect(createFrame).toBe(fk.createFrame);
    expect(color3FromRGB).toBe(fk.color3FromRGB);
    expect(spring).toBe(fk.spring);
    expect(typeof createFrame().onDestroy).toBe('function');
    expect(createValue).toBe(fk.createValue);
  });

  it('offers one object-centric API instead of parallel helper functions', () => {
    const frame = createFrame({ Name: 'Inventory' });

    expect(frame.Name).toBe('Inventory');
    expect(frame.ClassName).toBe('Frame');
    expect(frame.Parent).toBeUndefined();
    frame.Name = 'Shop';
    expect(frame.Name).toBe('Shop');
    expect(typeof frame.setProperties).toBe('function');
    expect(typeof frame.addChild).toBe('function');
    expect(typeof frame.getDescendants).toBe('function');
    expect(typeof frame.printTree).toBe('function');
    expect(typeof frame.destroy).toBe('function');
    expect(fk).not.toHaveProperty('append');
    expect(fk).not.toHaveProperty('update');
    expect(fk).not.toHaveProperty('destroy');
    expect(fk).not.toHaveProperty('state');
    expect(fk).not.toHaveProperty('color3');
    expect(fk).not.toHaveProperty('color3ToCss');
    expect(fk.createScrollingFrame()).not.toHaveProperty('scrollTo');
    expect(fk.createScrollingFrame()).not.toHaveProperty('getCanvasPosition');
  });
});
