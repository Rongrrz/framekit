import { describe, expect, it, vi } from 'vitest';

import { fk } from '../../../index.js';
import { resetDocumentAfterEach } from '../../support/reset-document.js';

resetDocumentAfterEach();

describe('frames', () => {
  it('uses a creation-only semantic host tag', () => {
    const defaultFrame = fk.createFrame();
    const article = fk.createFrame({}, { tagName: 'article' });

    expect(defaultFrame.unsafeElement.tagName).toBe('DIV');
    expect(article.unsafeElement.tagName).toBe('ARTICLE');
    expect(article.unsafeElement.style.margin).toBe('0px');
    expect(() => fk.createFrame({}, { tagName: 'button' } as never)).toThrow(/tagName/);
  });

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

    expect(frame.unsafeElement.style.width).toBe('calc(50% - 20px)');
    expect(frame.unsafeElement.style.height).toBe('calc(100% - 40px)');
    expect(frame.unsafeElement.style.transform).toBe('translate(-50%, -100%)');
    expect(frame.unsafeElement.style.getPropertyValue('rotate')).toBe('30deg');
    expect(frame.unsafeElement.style.backgroundColor).toContain('25');
    expect(frame.unsafeElement.style.display).toBe('none');
    expect(frame.unsafeElement.style.zIndex).toBe('8');
    expect(frame.Visible).toBe(false);
    expect(frame.Rotation).toBe(30);
  });

  it('writes only affected CSS and skips unchanged resolved output', () => {
    const frame = fk.createFrame();
    const setProperty = vi.spyOn(frame.unsafeElement.style, 'setProperty');

    frame.Rotation = 15;

    expect(setProperty).toHaveBeenCalledOnce();
    expect(setProperty).toHaveBeenLastCalledWith('rotate', '15deg');

    setProperty.mockClear();
    frame.Name = 'Renamed';
    frame.BackgroundColor3 = fk.color3FromRGB(200, 200, 200);

    expect(setProperty).not.toHaveBeenCalled();
  });

  it('rejects transparency outside its documented range', () => {
    expect(() => fk.createFrame({ BackgroundTransparency: -0.1 })).toThrow(/between 0 and 1/);
    expect(() => fk.createFrame({ BackgroundTransparency: 1.1 })).toThrow(/between 0 and 1/);
  });

  it('renders automatic sizing and descendant clipping', () => {
    const frame = fk.createFrame({ AutomaticSize: 'X', ClipsDescendants: true });

    expect(frame.unsafeElement.style.width).toBe('auto');
    expect(frame.unsafeElement.style.height).toBe('100px');
    expect(frame.unsafeElement.style.overflow).toBe('hidden');

    frame.setProperties({ AutomaticSize: 'XY', ClipsDescendants: false });

    expect(frame.unsafeElement.style.height).toBe('auto');
    expect(frame.unsafeElement.style.overflow).toBe('visible');
  });
});
