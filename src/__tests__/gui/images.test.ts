import { describe, expect, it } from 'vitest';

import { createImageLabel, update } from '../..';
import { resetDocumentAfterEach } from '../helpers/reset-document';

resetDocumentAfterEach();

describe('images', () => {
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
});
