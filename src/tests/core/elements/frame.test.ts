import { describe, expect, it, vi } from 'vitest';

import { fk } from '../../../index';
import { resetDocumentAfterEach } from '../../support/reset-document';

resetDocumentAfterEach();

describe('frames', () => {
  it('updates native styles from a property patch', () => {
    const frame = fk.createFrame();

    frame.setProperties({
      Size: fk.udim2(0.5, -20, 1, -40),
      Position: fk.udim2FromScale(0.5, 0.25),
      AnchorPoint: fk.vector2(0.5, 1),
      Rotation: 30,
      BackgroundColor3: fk.color3FromRGB(25, 50, 75),
      BackgroundTransparency: 0.25,
      Visible: false,
      ZIndex: 8,
    });

    expect(frame.element.style.width).toBe('calc(50% - 20px)');
    expect(frame.element.style.height).toBe('calc(100% - 40px)');
    expect(frame.element.style.transform).toBe('translate(-50%, -100%)');
    expect(frame.element.style.getPropertyValue('rotate')).toBe('30deg');
    expect(frame.element.style.backgroundColor).toContain('25');
    expect(frame.element.style.display).toBe('none');
    expect(frame.element.style.zIndex).toBe('8');
    expect(frame.Visible).toBe(false);
    expect(frame.Rotation).toBe(30);
  });

  it('writes only affected CSS and skips unchanged resolved output', () => {
    const frame = fk.createFrame();
    const setProperty = vi.spyOn(frame.element.style, 'setProperty');

    frame.Rotation = 15;

    expect(setProperty).toHaveBeenCalledOnce();
    expect(setProperty).toHaveBeenLastCalledWith('rotate', '15deg');

    setProperty.mockClear();
    frame.Name = 'Renamed';
    frame.BackgroundColor3 = fk.color3FromRGB(200, 200, 200);

    expect(setProperty).not.toHaveBeenCalled();
  });

  it('rejects non-finite rotations without disturbing the rendered angle', () => {
    const frame = fk.createFrame({ Rotation: -15 });

    expect(frame.element.style.getPropertyValue('rotate')).toBe('-15deg');
    expect(() => frame.setProperties({ Rotation: Number.NaN })).toThrow(/finite/);
    expect(frame.Rotation).toBe(-15);
    expect(frame.element.style.getPropertyValue('rotate')).toBe('-15deg');
  });

  it('renders automatic sizing and descendant clipping', () => {
    const frame = fk.createFrame({ AutomaticSize: 'X', ClipsDescendants: true });

    expect(frame.element.style.width).toBe('auto');
    expect(frame.element.style.height).toBe('100px');
    expect(frame.element.style.overflow).toBe('hidden');

    frame.setProperties({ AutomaticSize: 'XY', ClipsDescendants: false });

    expect(frame.element.style.height).toBe('auto');
    expect(frame.element.style.overflow).toBe('visible');
  });
});
