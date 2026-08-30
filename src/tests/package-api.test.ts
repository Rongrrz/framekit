import { describe, expect, it } from 'vitest';

import * as framekit from '..';
import { fk, fka, fkh } from '..';

describe('package API', () => {
  it('separates core, animation, and helper APIs', () => {
    expect(Object.keys(framekit).sort()).toEqual(['fk', 'fka', 'fkh']);

    expect(typeof fk.createFrame).toBe('function');
    expect(typeof fk.color3FromRGB).toBe('function');
    expect(typeof fk.createValue).toBe('function');
    expect(typeof fk.createUIGradient).toBe('function');
    expect(typeof fk.defineGuiObject).toBe('function');

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
    const frame: fk.Frame = fk.createFrame({ Name: 'Inventory' });
    const instance: fk.Instance = frame;
    const guiElement: fk.GuiElement = frame;
    const guiObject: fk.GuiObject = frame;

    expect(frame.Name).toBe('Inventory');
    expect(instance).toBe(frame);
    expect(guiElement).toBe(frame);
    expect(guiObject).toBe(frame);
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
    expect(typeof fk.createScrollingFrame().scrollTo).toBe('function');
    expect(fk.createScrollingFrame()).not.toHaveProperty('getCanvasPosition');
  });

  it('defines custom GUI classes without exposing runtime internals', () => {
    const createBadge = fk.defineGuiObject({
      className: 'Badge',
      defaultProperties: { Label: 'New' },
      defaultGuiProperties: { Size: fk.udim2FromOffset(80, 24) },
      applyProperties: (element, properties) => {
        element.textContent = properties.Label;
      },
      validate: (properties) => {
        if (properties.Label.length === 0) throw new TypeError('Label must not be empty.');
      },
    });
    const badge = createBadge();

    expect(badge.ClassName).toBe('Badge');
    expect(badge.Name).toBe('Badge');
    expect(badge.Label).toBe('New');
    expect(badge.element.textContent).toBe('New');

    badge.Label = 'Updated';

    expect(badge.element.textContent).toBe('Updated');
    expect(() => badge.setProperties({ Label: '' })).toThrow(/must not be empty/);
    expect(badge.Label).toBe('Updated');
  });

  it('restores custom GUI state and rendering after a property renderer fails', () => {
    const createFragileBadge = fk.defineGuiObject({
      className: 'FragileBadge',
      defaultProperties: { Label: 'Ready' },
      applyProperties: (element, properties) => {
        element.textContent = properties.Label;
        if (properties.Label === 'Rejected') throw new Error('render failed');
      },
    });
    const badge = createFragileBadge();

    expect(() => (badge.Label = 'Rejected')).toThrow(/render failed/);
    expect(badge.Label).toBe('Ready');
    expect(badge.element.textContent).toBe('Ready');
  });

  it('reports both the property failure and a failed rendering rollback', () => {
    let rollbackMustFail = false;
    const createFragileBadge = fk.defineGuiObject({
      className: 'FragileBadge',
      defaultProperties: { Label: 'Ready' },
      applyProperties: (element, properties) => {
        element.textContent = properties.Label;
        if (properties.Label === 'Rejected') {
          rollbackMustFail = true;
          throw new Error('render failed');
        }
        if (rollbackMustFail) throw new Error('rollback failed');
      },
    });
    const badge = createFragileBadge();

    let failure: unknown;
    try {
      badge.Label = 'Rejected';
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).errors).toEqual([
      expect.objectContaining({ message: 'render failed' }),
      expect.objectContaining({ message: 'rollback failed' }),
    ]);
    expect(badge.Label).toBe('Ready');
    expect(badge.element.textContent).toBe('Ready');
  });
});
