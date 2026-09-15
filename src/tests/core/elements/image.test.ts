import { describe, expect, it } from 'vitest';

import { fk } from '../../../index';
import { resetDocumentAfterEach } from '../../support/reset-document';

resetDocumentAfterEach();

describe('images', () => {
  it('uses a creation-only semantic wrapper tag', () => {
    const figure = fk.createImageLabel({}, { tagName: 'figure' });

    expect(figure.unsafeElement.tagName).toBe('FIGURE');
    expect(figure.unsafeElement.querySelector('img')).not.toBeNull();
    expect(() => fk.createImageLabel({}, { tagName: 'picture' } as never)).toThrow(/tagName/);
  });

  it('maps image properties to a native image element', () => {
    const image = fk.createImageLabel({
      Image: '/item.png',
      AltText: 'Item',
      ScaleType: 'Crop',
      ImageTransparency: 0.25,
    });
    const element = image.unsafeElement.querySelector('img');

    expect(element?.getAttribute('src')).toBe('/item.png');
    expect(element?.alt).toBe('Item');
    expect(element?.style.objectFit).toBe('cover');
    expect(element?.style.opacity).toBe('0.75');
  });

  it('removes the native URL when an image source is cleared', () => {
    const image = fk.createImageLabel({ Image: '/item.png' });

    image.setProperties({ Image: '' });

    expect(image.unsafeElement.querySelector('img')?.hasAttribute('src')).toBe(false);
  });

  it('rejects executable URL schemes without corrupting the previous source', () => {
    expect(() => fk.createImageLabel({ Image: 'javascript:alert(1)' })).toThrow(
      /Unsupported image URL protocol/,
    );

    const image = fk.createImageLabel({ Image: '/safe.png' });

    expect(() => image.setProperties({ Image: 'javascript:alert(1)' })).toThrow(
      /Unsupported image URL protocol/,
    );
    expect(image.Image).toBe('/safe.png');
    expect(image.unsafeElement.querySelector('img')?.getAttribute('src')).toBe('/safe.png');
  });
});
