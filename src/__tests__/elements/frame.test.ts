import {
  color3FromRGB,
  createFrame,
  createUIGridLayout,
  createUIListLayout,
  udim2,
  udim2FromOffset,
  udim2FromScale,
  vector2,
} from 'framekit';
import { describe, expect, it, vi } from 'vitest';

describe('frames', () => {
  it('keeps native dialog geometry independent of parent layouts and browser defaults', () => {
    const parent = createFrame();
    const list = createUIListLayout();
    list.Parent = parent;
    const dialog = createFrame({ TagName: 'dialog', Position: udim2FromScale(0.5, 0.5) });
    dialog.Parent = parent;
    expect(dialog.unsafeElement.style.position).toBe('fixed');
    expect(dialog.unsafeElement.style.left).toBe('50%');
    expect(dialog.unsafeElement.style.padding).toBe('0px');
    expect(dialog.unsafeElement.style.borderWidth).toBe('0px');

    list.destroy();
    createUIGridLayout().Parent = parent;
    dialog.Position = udim2FromOffset(40, 60);
    expect(dialog.unsafeElement.style.position).toBe('fixed');
    expect(dialog.unsafeElement.style.top).toBe('60px');
    expect(dialog.unsafeElement.style.width).toBe('100px');
    parent.destroy();
  });

  it('keeps prepared defaults independent across instances, documents, tags, and destruction', () => {
    const firstDocument = document.implementation.createHTMLDocument();
    const secondDocument = document.implementation.createHTMLDocument();

    const first = createFrame(
      { TagName: 'article', Size: udim2FromOffset(240, 80), Rotation: 45, Visible: false },
      { ownerDocument: firstDocument },
    );

    const parent = createFrame({}, { ownerDocument: firstDocument });
    createUIGridLayout({ CellSize: udim2FromOffset(75, 30) }).Parent = parent;
    first.Parent = parent;
    expect(first.unsafeElement.style.width).toBe('100%');
    first.Parent = undefined;
    expect(first.unsafeElement.style.width).toBe('240px');
    first.destroy();
    parent.destroy();

    const second = createFrame({ TagName: 'article' }, { ownerDocument: firstDocument });
    const third = createFrame({}, { ownerDocument: secondDocument });
    expect(second.unsafeElement.ownerDocument).toBe(firstDocument);
    expect(second.unsafeElement.tagName).toBe('ARTICLE');
    expect(third.unsafeElement.ownerDocument).toBe(secondDocument);
    expect(third.unsafeElement.tagName).toBe('DIV');
    expect(second.unsafeElement).not.toBe(third.unsafeElement);

    for (const frame of [second, third]) {
      expect(frame.unsafeElement.style.width).toBe('100px');
      expect(frame.unsafeElement.style.height).toBe('100px');
      expect(frame.unsafeElement.style.getPropertyValue('rotate')).toBe('0deg');
      expect(frame.unsafeElement.style.display).toBe('');
      expect(frame.Parent).toBeUndefined();
      expect(frame.isDestroyed()).toBe(false);
      frame.destroy();
    }
  });

  it('uses a creation-only semantic host tag', () => {
    const defaultFrame = createFrame();
    const article = createFrame({ TagName: 'article' });

    expect(defaultFrame.unsafeElement.tagName).toBe('DIV');
    expect(article.unsafeElement.tagName).toBe('ARTICLE');
    expect(article.unsafeElement.style.margin).toBe('0px');
    expect(() => createFrame({ TagName: 'button' } as never)).toThrow(/TagName/);
    expect(() => article.setProperties({ TagName: 'section' } as never)).toThrow(
      /Unknown property/,
    );
    expect(article.unsafeElement.tagName).toBe('ARTICLE');
  });

  it('updates native styles from a property patch', () => {
    const frame = createFrame();

    frame.setProperties({
      Size: udim2(0.5, -20, 1, -40),
      Position: udim2FromScale(0.5, 0.25),
      AnchorPoint: vector2(0.5, 1),
      Rotation: 30,
      BackgroundColor3: color3FromRGB(25, 50, 75),
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
    const frame = createFrame();
    const setProperty = vi.spyOn(frame.unsafeElement.style, 'setProperty');

    frame.Rotation = 15;

    expect(setProperty).toHaveBeenCalledOnce();
    expect(setProperty).toHaveBeenLastCalledWith('rotate', '15deg');

    setProperty.mockClear();
    frame.Name = 'Renamed';
    frame.BackgroundColor3 = color3FromRGB(200, 200, 200);

    expect(setProperty).not.toHaveBeenCalled();
  });

  it('rejects transparency outside its documented range', () => {
    expect(() => createFrame({ BackgroundTransparency: -0.1 })).toThrow(/between 0 and 1/);
    expect(() => createFrame({ BackgroundTransparency: 1.1 })).toThrow(/between 0 and 1/);
  });

  it('renders automatic sizing and descendant clipping', () => {
    const frame = createFrame({ AutomaticSize: 'X', ClipsDescendants: true });

    expect(frame.unsafeElement.style.width).toBe('auto');
    expect(frame.unsafeElement.style.height).toBe('100px');
    expect(frame.unsafeElement.style.overflow).toBe('hidden');

    frame.setProperties({ AutomaticSize: 'XY', ClipsDescendants: false });

    expect(frame.unsafeElement.style.height).toBe('auto');
    expect(frame.unsafeElement.style.overflow).toBe('visible');
  });
});
