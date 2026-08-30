import { describe, expect, it } from 'vitest';

import { fk } from '../../..';
import { resetDocumentAfterEach } from '../../support/reset-document';

const { createImageLabel } = fk;
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

    image.setProperties({ Image: '' });

    expect(image.element.querySelector('img')?.hasAttribute('src')).toBe(false);
  });

  it('rejects executable URL schemes without corrupting the previous source', () => {
    expect(() => createImageLabel({ Image: 'javascript:alert(1)' })).toThrow(
      /Unsupported image URL protocol/,
    );

    const image = createImageLabel({ Image: '/safe.png' });

    expect(() => image.setProperties({ Image: 'javascript:alert(1)' })).toThrow(
      /Unsupported image URL protocol/,
    );
    expect(image.Image).toBe('/safe.png');
    expect(image.element.querySelector('img')?.getAttribute('src')).toBe('/safe.png');
  });
});
