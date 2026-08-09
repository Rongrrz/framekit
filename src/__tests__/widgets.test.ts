import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  append,
  canvasPosition,
  color3,
  createFrame,
  createImageButton,
  createImageLabel,
  createNode,
  createScrollingFrame,
  createTextButton,
  createTextLabel,
  createUICorner,
  createUIListLayout,
  createUIStroke,
  detach,
  destroy,
  isDestroyed,
  on,
  parent,
  scrollTo,
  udim,
  udim2FromOffset,
  update,
} from '..';

afterEach(() => document.body.replaceChildren());

describe('text UI objects', () => {
  it('synchronizes text properties without replacing node children', () => {
    const label = createTextLabel();
    const child = createTextLabel();
    append(label, child);
    update(label, {
      Text: 'Inventory',
      TextColor3: color3(10, 20, 30),
      TextSize: 24,
      TextWrapped: true,
      TextXAlignment: 'Left',
    });
    expect(label.element.querySelector('[data-framekit-text]')?.textContent).toBe('Inventory');
    expect(label.element.querySelector<HTMLElement>('[data-framekit-text]')?.style.fontSize).toBe(
      '24px',
    );
    expect(label.element.contains(child.element)).toBe(true);
  });

  it('uses a semantic button, typed events, and lifecycle cleanup', () => {
    const button = createTextButton();
    const callback = vi.fn();
    const unsubscribe = on(button, 'MouseButton1Click', callback);
    expect(button.element.tagName).toBe('BUTTON');
    button.element.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    button.element.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    expect(callback).toHaveBeenCalledOnce();
    button.element.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    button.element.dispatchEvent(new MouseEvent('mouseleave'));
    button.element.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    expect(callback).toHaveBeenCalledOnce();
    unsubscribe();
    button.element.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    button.element.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    expect(callback).toHaveBeenCalledOnce();
    destroy(button);
    expect(() => on(button, 'MouseButton1Click', callback)).toThrow(/destroyed/);
  });

  it('does not fire button press events while disabled', () => {
    const button = createTextButton({ Disabled: true });
    const callback = vi.fn();
    on(button, 'MouseButton1Click', callback);
    button.element.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    button.element.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('UI decorators', () => {
  it('rejects parents that do not have a DOM element', () => {
    const group = createNode({ Name: 'Group' });
    const corner = createUICorner({ CornerRadius: 8 });
    expect(() => append(group, corner)).toThrow(/DOM-backed/);
    expect(parent(corner)).toBeUndefined();
  });

  it('applies, updates, and removes corner and stroke styles through the tree', () => {
    const frame = createTextLabel();
    const baseCorner = createUICorner({ CornerRadius: 3 });
    const corner = createUICorner({ CornerRadius: 12 });
    const stroke = createUIStroke({
      Color: color3(10, 20, 30),
      Thickness: 2,
      BorderStrokePosition: 'Inner',
    });
    append(frame, baseCorner);
    append(frame, corner);
    append(frame, stroke);
    expect(frame.element.style.borderRadius).toBe('12px');
    expect(frame.element.style.boxShadow).toContain('inset');
    expect(frame.element.style.boxShadow).toContain('2px');

    update(corner, { CornerRadius: 18 });
    update(stroke, { BorderStrokePosition: 'Center', Thickness: 4 });
    expect(frame.element.style.borderRadius).toBe('18px');
    expect(frame.element.style.boxShadow).toContain('2px');

    update(corner, { Enabled: false });
    expect(frame.element.style.borderRadius).toBe('3px');
    update(corner, { Enabled: true });
    detach(corner);
    expect(frame.element.style.borderRadius).toBe('3px');
    destroy(frame);
    expect(isDestroyed(baseCorner)).toBe(true);
    expect(isDestroyed(stroke)).toBe(true);
  });

  it('recomputes both parents when a decorator is moved', () => {
    const first = createTextLabel();
    const second = createTextLabel();
    const corner = createUICorner({ CornerRadius: 10 });
    append(first, corner);
    expect(first.element.style.borderRadius).toBe('10px');

    append(second, corner);
    expect(first.element.style.borderRadius).toBe('');
    expect(second.element.style.borderRadius).toBe('10px');
  });
});

describe('UI list layouts', () => {
  it('lays out direct GUI children and restores their positioning when detached', () => {
    const frame = createFrame();
    const first = createFrame({
      Name: 'First',
      Position: udim2FromOffset(10, 20),
      LayoutOrder: 2,
    });
    const second = createFrame({ Name: 'Second', LayoutOrder: 1 });
    const layout = createUIListLayout({ Padding: udim(0, 8) });
    append(frame, first);
    append(frame, second);
    append(frame, layout);

    expect(frame.element.style.display).toBe('flex');
    expect(frame.element.style.flexDirection).toBe('column');
    expect(frame.element.style.gap).toBe('8px');
    expect(first.element.style.position).toBe('relative');
    expect(first.element.style.left).toBe('auto');
    expect(first.element.style.order).toBe('1');
    expect(second.element.style.order).toBe('0');

    update(first, { Position: udim2FromOffset(25, 30), LayoutOrder: 0 });
    expect(first.element.style.left).toBe('auto');
    expect(first.element.style.order).toBe('0');
    expect(second.element.style.order).toBe('1');

    detach(layout);
    expect(frame.element.style.display).toBe('');
    expect(first.element.style.position).toBe('absolute');
    expect(first.element.style.left).toBe('25px');
    expect(first.element.style.top).toBe('30px');
  });

  it('updates direction, alignment, wrapping, and name sorting', () => {
    const frame = createFrame({ Visible: false });
    const zebra = createFrame({ Name: 'Zebra' });
    const alpha = createFrame({ Name: 'Alpha' });
    const layout = createUIListLayout({ SortOrder: 'Name' });
    append(frame, zebra);
    append(frame, alpha);
    append(frame, layout);
    expect(frame.element.style.display).toBe('none');
    expect(zebra.element.style.order).toBe('1');
    expect(alpha.element.style.order).toBe('0');

    update(frame, { Visible: true });
    update(layout, {
      FillDirection: 'Horizontal',
      HorizontalAlignment: 'Center',
      VerticalAlignment: 'Bottom',
      Wraps: true,
    });
    expect(frame.element.style.display).toBe('flex');
    expect(frame.element.style.flexDirection).toBe('row');
    expect(frame.element.style.flexWrap).toBe('wrap');
    expect(frame.element.style.justifyContent).toBe('center');
    expect(frame.element.style.alignItems).toBe('flex-end');

    update(zebra, { Name: 'Aardvark' });
    expect(zebra.element.style.order).toBe('0');
    expect(alpha.element.style.order).toBe('1');
  });

  it('rejects element-less parents', () => {
    const group = createNode({ Name: 'Group' });
    const layout = createUIListLayout();
    expect(() => append(group, layout)).toThrow(/DOM-backed/);
    expect(parent(layout)).toBeUndefined();
  });
});

describe('image and scrolling UI objects', () => {
  it('maps image properties to a native image element', () => {
    const image = createImageLabel({
      Image: '/item.png',
      AltText: 'Item',
      ScaleType: 'Crop',
      ImageTransparency: 0.25,
    });
    const element = image.element.querySelector('img');
    expect(element?.getAttribute('src')).toBe('/item.png');
    expect(element?.alt).toBe('Item');
    expect(element?.style.objectFit).toBe('cover');
    expect(element?.style.opacity).toBe('0.75');
  });

  it('removes the native URL when an image source is cleared', () => {
    const image = createImageLabel({ Image: '/item.png' });
    update(image, { Image: '' });
    expect(image.element.querySelector('img')?.hasAttribute('src')).toBe(false);
  });

  it('uses semantic image buttons and native overflow', () => {
    const button = createImageButton({ Disabled: true });
    const scrolling = createScrollingFrame({ ScrollingDirection: 'Y' });
    expect(button.element.tagName).toBe('BUTTON');
    expect(button.element.disabled).toBe(true);
    update(button, { Disabled: false });
    expect(button.element.disabled).toBe(false);
    expect(scrolling.element.style.overflowX).toBe('hidden');
    expect(scrolling.element.style.overflowY).toBe('auto');
    update(scrolling, { ScrollingDirection: 'X' });
    expect(scrolling.element.style.overflowX).toBe('auto');
    expect(scrolling.element.style.overflowY).toBe('hidden');
  });

  it('reads and writes scrolling positions through lifecycle-aware helpers', () => {
    const scrolling = createScrollingFrame();
    scrolling.element.scrollLeft = 12;
    scrolling.element.scrollTop = 34;
    expect(canvasPosition(scrolling)).toEqual({ X: 12, Y: 34 });

    const nativeScrollTo = vi.fn();
    scrolling.element.scrollTo = nativeScrollTo;
    scrollTo(scrolling, { X: 56, Y: 78 });
    expect(nativeScrollTo).toHaveBeenCalledWith(56, 78);

    destroy(scrolling);
    expect(() => canvasPosition(scrolling)).toThrow(/destroyed/);
  });
});
