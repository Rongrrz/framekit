import { afterEach, describe, expect, it, vi } from 'vitest';

import { ImageButton } from '../gui/ImageButton';
import { ImageLabel } from '../gui/ImageLabel';
import { ScrollingFrame } from '../gui/ScrollingFrame';
import { TextButton } from '../gui/TextButton';
import { TextLabel } from '../gui/TextLabel';
import { Color3 } from '../primitives/Color3';

afterEach(() => document.body.replaceChildren());

describe('text UI objects', () => {
  it('synchronizes text properties without replacing instance children', () => {
    const label = new TextLabel();
    const child = new TextLabel();
    child.Parent = label;
    label.Text = 'Inventory';
    label.TextColor3 = Color3.fromRGB(10, 20, 30);
    label.TextSize = 24;
    label.TextWrapped = true;
    label.TextXAlignment = 'Left';
    expect(label.Element.querySelector('[data-framekit-text]')?.textContent).toBe('Inventory');
    expect(label.Element.querySelector<HTMLElement>('[data-framekit-text]')?.style.fontSize).toBe(
      '24px',
    );
    expect(label.Element.contains(child.Element)).toBe(true);
  });

  it('uses a semantic button, fires disconnectable signals, and cleans up', () => {
    const button = new TextButton();
    const callback = vi.fn();
    const connection = button.MouseButton1Click.Connect(callback);
    expect(button.Element.tagName).toBe('BUTTON');
    button.Element.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    button.Element.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    expect(callback).toHaveBeenCalledOnce();
    connection.Disconnect();
    expect(connection.Connected).toBe(false);
    button.Destroy();
    expect(() => button.MouseButton1Click.Connect(callback)).toThrow(/destroyed/);
  });
});

describe('image and scrolling UI objects', () => {
  it('maps image properties to a native image element', () => {
    const image = new ImageLabel();
    image.Image = '/item.png';
    image.AltText = 'Item';
    image.ScaleType = 'Crop';
    image.ImageTransparency = 0.25;
    const element = image.Element.querySelector('img');
    expect(element?.getAttribute('src')).toBe('/item.png');
    expect(element?.alt).toBe('Item');
    expect(element?.style.objectFit).toBe('cover');
    expect(element?.style.opacity).toBe('0.75');
  });

  it('uses semantic image buttons and native overflow', () => {
    const button = new ImageButton();
    const scrolling = new ScrollingFrame();
    scrolling.ScrollingDirection = 'Y';
    expect(button.Element.tagName).toBe('BUTTON');
    expect(scrolling.Element.style.overflowX).toBe('hidden');
    expect(scrolling.Element.style.overflowY).toBe('auto');
  });
});
