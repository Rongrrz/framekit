import { describe, expect, it } from 'vitest';

import * as framekit from '..';
import { fk, fka, fkh } from '..';

describe('package API', () => {
  it('separates core, animation, and helper APIs', () => {
    expect(Object.keys(framekit).sort()).toEqual(['fk', 'fka', 'fkh']);

    expect(typeof fk.createFrame).toBe('function');
    expect(typeof fk.color3FromRGB).toBe('function');
    expect(typeof fk.createValue).toBe('function');

    expect(typeof fka.spring).toBe('function');
    expect(typeof fka.createTween).toBe('function');
    expect(fka).not.toHaveProperty('createMotion');
    expect(fka).not.toHaveProperty('tweenInfo');

    expect(typeof fkh.bindHoverScale).toBe('function');
    expect(typeof fkh.setModifierAttached).toBe('function');
    expect(fkh).not.toHaveProperty('createSpringModifierToggle');
    expect(fk).not.toHaveProperty('createUIGlow');

    expect(fk).not.toHaveProperty('spring');
    expect(fka).not.toHaveProperty('createFrame');
  });

  it('keeps the core API object-centric', () => {
    const frame = fk.createFrame({ Name: 'Inventory' });

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
