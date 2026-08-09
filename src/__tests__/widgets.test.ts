import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  append,
  Color3,
  createImageButton,
  createImageLabel,
  createScrollingFrame,
  createTextButton,
  createTextLabel,
  createUICorner,
  createUIStroke,
  detach,
  destroy,
  isDestroyed,
  on,
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
      TextColor3: Color3.fromRGB(10, 20, 30),
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
    unsubscribe();
    button.element.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    button.element.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    expect(callback).toHaveBeenCalledOnce();
    destroy(button);
    expect(() => on(button, 'MouseButton1Click', callback)).toThrow(/destroyed/);
  });
});

describe('UI decorators', () => {
  it('applies, updates, and removes corner and stroke styles through the tree', () => {
    const frame = createTextLabel();
    const baseCorner = createUICorner({ CornerRadius: 3 });
    const corner = createUICorner({ CornerRadius: 12 });
    const stroke = createUIStroke({
      Color: Color3.fromRGB(10, 20, 30),
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

  it('uses semantic image buttons and native overflow', () => {
    const button = createImageButton({ Disabled: true });
    const scrolling = createScrollingFrame({ ScrollingDirection: 'Y' });
    expect(button.element.tagName).toBe('BUTTON');
    expect((button.element as HTMLButtonElement).disabled).toBe(true);
    update(button, { Disabled: false });
    expect((button.element as HTMLButtonElement).disabled).toBe(false);
    expect(scrolling.element.style.overflowX).toBe('hidden');
    expect(scrolling.element.style.overflowY).toBe('auto');
  });
});
