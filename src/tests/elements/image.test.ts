import { describe, expect, it } from 'vitest';

import { createImageLabel } from '../../index.js';
import { resetDocumentAfterEach } from '../support/reset-document.js';

resetDocumentAfterEach();

describe('images', () => {
  it('uses a creation-only semantic wrapper tag', () => {
    const figure = createImageLabel({}, { tagName: 'figure' });

    expect(figure.unsafeElement.tagName).toBe('FIGURE');
    expect(figure.unsafeElement.querySelector('img')).not.toBeNull();
    expect(() => createImageLabel({}, { tagName: 'picture' } as never)).toThrow(/tagName/);
  });

  it('maps image properties to a native image element', () => {
    const image = createImageLabel({
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
    const image = createImageLabel({ Image: '/item.png' });

    image.setProperties({ Image: '' });

    expect(image.unsafeElement.querySelector('img')?.hasAttribute('src')).toBe(false);
  });

  it.each([
    'javascript:alert(1)',
    ' JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
  ])('rejects unsafe image source %s without corrupting the previous source', (source) => {
    expect(() => createImageLabel({ Image: source })).toThrow(/Unsupported image URL protocol/);

    const image = createImageLabel({ Image: '/safe.png' });

    expect(() => image.setProperties({ Image: source })).toThrow(/Unsupported image URL protocol/);
    expect(image.Image).toBe('/safe.png');
    expect(image.unsafeElement.querySelector('img')?.getAttribute('src')).toBe('/safe.png');
  });

  it.each([
    'https://example.com/image.png',
    'blob:https://example.com/image',
    'data:image/png;base64,iVBORw0KGgo=',
  ])('accepts supported image source %s', (source) => {
    const image = createImageLabel({ Image: source });
    expect(image.unsafeElement.querySelector('img')?.getAttribute('src')).toBe(source);
    image.destroy();
  });
});
