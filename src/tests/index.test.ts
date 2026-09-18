import { describe, expect, it } from 'vitest';

import { fk, fka, fkh } from '../index';
import * as framekit from '../index';

describe('package API', () => {
  it('separates core, animation, and helper APIs', () => {
    expect(Object.keys(framekit).sort()).toEqual(['fk', 'fka', 'fkh']);

    expect(typeof fk.createFrame).toBe('function');
    expect(typeof fk.createLink).toBe('function');
    expect(typeof fk.createTextInput).toBe('function');
    expect(typeof fk.createTextArea).toBe('function');
    expect(fk).not.toHaveProperty('createTextBox');
    expect(typeof fk.color3FromRGB).toBe('function');
    expect(typeof fk.createValue).toBe('function');
    expect(typeof fk.createUIGradient).toBe('function');
    expect(typeof fk.createUITextStroke).toBe('function');
    expect(fk).not.toHaveProperty('defineGuiObject');

    expect(typeof fka.createTween).toBe('function');
    expect(typeof fka.spring).toBe('function');
    expect(fka).not.toHaveProperty('TweenService');
    expect(fka).not.toHaveProperty('SpringService');
    expect(fka).not.toHaveProperty('createMotion');
    expect(fka).not.toHaveProperty('tweenInfo');

    expect(typeof fkh.bindHoverScale).toBe('function');
    expect(typeof fkh.bindResponsiveLayout).toBe('function');
    expect(fkh).not.toHaveProperty('createAutoYScrollingFrame');
    expect(fkh).not.toHaveProperty('setModifierAttached');
    expect(fkh).not.toHaveProperty('createSpringModifierToggle');
    expect(fk).not.toHaveProperty('createUIGlow');

    expect(fka).not.toHaveProperty('createFrame');
    expect(fk).not.toHaveProperty('spring');
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
    expect(frame).not.toHaveProperty('addChild');
    expect(frame).not.toHaveProperty('removeFromParent');
    expect(typeof frame.getDescendants).toBe('function');
    expect(frame).not.toHaveProperty('printTree');
    expect(frame).not.toHaveProperty('watch');
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

  it('excludes discrete numeric properties from animation goals', () => {
    const frame = fk.createFrame();

    const invalidAnimationGoals = (): void => {
      // @ts-expect-error ZIndex changes discretely and cannot be interpolated.
      fka.spring(frame, { ZIndex: 2 });
      // @ts-expect-error LayoutOrder changes discretely and cannot be interpolated.
      fka.createTween(frame, { Duration: 1 }, { LayoutOrder: 2 });
    };
    void invalidAnimationGoals;

    expect(frame.ZIndex).toBe(1);
  });
});
