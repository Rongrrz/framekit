import { describe, expect, it, vi } from 'vitest';

import { createStyleModifier } from '../../../core/node/modifier.js';
import { fk } from '../../../index.js';

describe('node properties', () => {
  it('commits and renders an entire patch before notifying property observers', () => {
    const frame = fk.createFrame({ Rotation: 0, Visible: true });
    const observedStates: unknown[] = [];

    frame.onPropertyChanged('Rotation', (value, previousValue) => {
      observedStates.push({
        value,
        previousValue,
        visible: frame.Visible,
        display: frame.unsafeElement.style.display,
        rotation: frame.unsafeElement.style.getPropertyValue('rotate'),
      });
    });

    frame.setProperties({ Rotation: 45, Visible: false });

    expect(observedStates).toEqual([
      { value: 45, previousValue: 0, visible: false, display: 'none', rotation: '45deg' },
    ]);
  });

  it('rejects the entire patch before notifying observers when one property is invalid', () => {
    const frame = fk.createFrame({ Rotation: 0, ZIndex: 1 });
    const changed = vi.fn();

    frame.onPropertyChanged('Rotation', changed);

    expect(() => frame.setProperties({ Rotation: 45, ZIndex: 1.5 })).toThrow(/integer/);
    expect(frame.Rotation).toBe(0);
    expect(frame.ZIndex).toBe(1);
    expect(frame.unsafeElement.style.getPropertyValue('rotate')).toBe('0deg');
    expect(changed).not.toHaveBeenCalled();
  });

  it('restores committed state and rendering when a derived renderer rejects an update', () => {
    const frame = fk.createFrame({ Name: 'Ready' });
    const changed = vi.fn();
    const modifier = createStyleModifier('Fragile', { Name: 'Fragile' }, (_, target) => {
      if (target.properties.Name === 'Rejected') throw new Error('render failed');
      return { 'border-radius': '4px' };
    });

    modifier.Parent = frame;
    frame.onPropertyChanged('Name', changed);

    expect(() => (frame.Name = 'Rejected')).toThrow(/render failed/);
    expect(frame.Name).toBe('Ready');
    expect(frame.unsafeElement.style.borderRadius).toBe('4px');
    expect(changed).not.toHaveBeenCalled();
  });

  it('reports typed property changes after successful updates', () => {
    const frame = fk.createFrame();
    const listener = vi.fn();
    const unsubscribe = frame.onPropertyChanged('Position', listener);
    const firstPosition = fk.udim2FromOffset(20, 30);
    const secondPosition = fk.udim2FromOffset(40, 50);

    frame.Position = firstPosition;
    frame.setProperties({ Position: secondPosition });
    frame.Position = secondPosition;

    expect(listener).toHaveBeenNthCalledWith(1, firstPosition, fk.udim2FromOffset(0, 0));
    expect(listener).toHaveBeenNthCalledWith(2, secondPosition, firstPosition);

    unsubscribe();
    frame.Position = fk.udim2FromOffset(60, 70);

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('rejects unknown properties in constructors and updates', () => {
    expect(() => fk.createFrame({ Typo: true } as never)).toThrow(/Unknown property "Typo"/);

    const frame = fk.createFrame();

    expect(() => frame.setProperties({ Typo: true } as never)).toThrow(/Unknown property "Typo"/);
  });

  it('rejects invalid primitive values and enum members without changing state', () => {
    expect(() => fk.createFrame({ Rotation: Number.NaN })).toThrow(/Rotation.*finite/);

    const frame = fk.createFrame({ Rotation: -15 });

    expect(() => frame.setProperties({ ZIndex: 1.5 })).toThrow(/ZIndex.*integer/);
    expect(() => (frame.Rotation = Number.POSITIVE_INFINITY)).toThrow(/Rotation.*finite/);
    expect(() => frame.setProperties({ AutomaticSize: 'Invalid' } as never)).toThrow(
      /AutomaticSize/,
    );
    expect(frame).toMatchObject({ Rotation: -15, ZIndex: 1, AutomaticSize: 'None', Visible: true });
    expect(frame.unsafeElement.style.getPropertyValue('rotate')).toBe('-15deg');
  });

  it('rejects malformed JavaScript values at the rendering boundary', () => {
    const frame = fk.createFrame();

    expect(() => frame.setProperties({ Visible: 'yes' } as never)).toThrow(
      /Visible must be a boolean/,
    );
    expect(() => frame.setProperties({ Name: 42 } as never)).toThrow(/Name must be a string/);
    expect(() => frame.setProperties({ AnchorPoint: { X: 0, Y: 'center' } } as never)).toThrow(
      /AnchorPoint\.Y must be a finite number/,
    );
    expect(() =>
      frame.setProperties({ BackgroundColor3: { R: 999, G: 0, B: 0 } } as never),
    ).toThrow(/Color3 channels/);
    expect(frame).toMatchObject({
      Name: 'Frame',
      Visible: true,
      AnchorPoint: fk.vector2(0, 0),
    });
  });

  it('stores structured properties as immutable snapshots', () => {
    const position = {
      X: { Scale: 0, Offset: 10 },
      Y: { Scale: 0, Offset: 20 },
    };
    const frame = fk.createFrame({ Position: position });

    position.X.Offset = 999;

    expect(frame.Position).toEqual(fk.udim2FromOffset(10, 20));
    expect(Object.isFrozen(frame.Position)).toBe(true);
    expect(Object.isFrozen(frame.Position.X)).toBe(true);
    expect(frame.unsafeElement.style.left).toBe('10px');
  });

  it('evaluates accessor-backed frozen inputs once instead of retaining live getters', () => {
    let offset = 10;
    const position = Object.freeze({
      X: Object.freeze({
        Scale: 0,
        get Offset() {
          return offset;
        },
      }),
      Y: fk.udim(0, 20),
    });
    const frame = fk.createFrame({ Position: position });

    offset = 999;

    expect(frame.Position).toEqual(fk.udim2FromOffset(10, 20));
    expect(frame.unsafeElement.style.left).toBe('10px');
  });
});
