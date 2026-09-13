import { describe, expect, it, vi } from 'vitest';

import { fk } from '../../../index';
import { resetDocumentAfterEach } from '../../support/reset-document';

resetDocumentAfterEach();

describe('links', () => {
  it('uses a native anchor with text styling and typed activation', () => {
    const link = fk.createLink({
      Text: 'Read the guide',
      Href: '/guide',
      Target: '_blank',
      Rel: 'help noopener',
      AccessibleLabel: 'Read the FrameKit guide',
    });
    const onClick = vi.fn((event: MouseEvent) => event.preventDefault());

    link.onClick(onClick);
    link.element.dispatchEvent(new MouseEvent('click', { cancelable: true }));

    expect(link.element.tagName).toBe('A');
    expect(link.element.getAttribute('href')).toBe('/guide');
    expect(link.element.target).toBe('_blank');
    expect(link.element.rel).toBe('help noopener');
    expect(link.element.getAttribute('aria-label')).toBe('Read the FrameKit guide');
    expect(link.element.querySelector('[data-framekit-text]')?.textContent).toBe('Read the guide');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('updates and clears native navigation attributes', () => {
    const link = fk.createLink({ Href: '/download', Download: 'guide.pdf' });

    expect(link.element.download).toBe('guide.pdf');

    link.setProperties({ Href: '', Download: '', AccessibleLabel: '' });

    expect(link.element.hasAttribute('href')).toBe(false);
    expect(link.element.hasAttribute('download')).toBe(false);
    expect(link.element.hasAttribute('aria-label')).toBe(false);
  });

  it('rejects executable destinations without corrupting the current href', () => {
    const link = fk.createLink({ Href: '/safe' });

    expect(() => link.setProperties({ Href: 'javascript:alert(1)' })).toThrow(
      /Unsupported link URL protocol/,
    );
    expect(link.Href).toBe('/safe');
    expect(link.element.getAttribute('href')).toBe('/safe');
  });
});
