import { describe, expect, it, vi } from 'vitest';

import { fk } from '../../../index.js';
import { resetDocumentAfterEach } from '../../support/reset-document.js';

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
    link.unsafeElement.dispatchEvent(new MouseEvent('click', { cancelable: true }));

    expect(link.unsafeElement.tagName).toBe('A');
    expect(link.unsafeElement.getAttribute('href')).toBe('/guide');
    expect(link.unsafeElement.target).toBe('_blank');
    expect(link.unsafeElement.rel).toBe('help noopener');
    expect(link.unsafeElement.getAttribute('aria-label')).toBe('Read the FrameKit guide');
    expect(link.unsafeElement.querySelector('[data-framekit-text]')?.textContent).toBe(
      'Read the guide',
    );
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('updates and clears native navigation attributes', () => {
    const link = fk.createLink({ Href: '/download', Download: 'guide.pdf' });

    expect(link.unsafeElement.download).toBe('guide.pdf');

    link.setProperties({ Href: '', Download: '', AccessibleLabel: '' });

    expect(link.unsafeElement.hasAttribute('href')).toBe(false);
    expect(link.unsafeElement.hasAttribute('download')).toBe(false);
    expect(link.unsafeElement.hasAttribute('aria-label')).toBe(false);
  });

  it('rejects executable destinations without corrupting the current href', () => {
    const link = fk.createLink({ Href: '/safe' });

    expect(() => link.setProperties({ Href: 'javascript:alert(1)' })).toThrow(
      /Unsupported link URL protocol/,
    );
    expect(link.Href).toBe('/safe');
    expect(link.unsafeElement.getAttribute('href')).toBe('/safe');
  });

  it('rejects GUI children that would create invalid interactive nesting', () => {
    const link = fk.createLink();

    expect(() => (fk.createFrame().Parent = link)).toThrow(/cannot contain GUI children/);
  });
});
