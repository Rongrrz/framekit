import { describe, expect, it, vi } from 'vitest';

import { createFrame, createLink } from '../../../index.js';
import { resetDocumentAfterEach } from '../../support/reset-document.js';

resetDocumentAfterEach();

describe('links', () => {
  it('uses a native anchor with text styling and typed activation', () => {
    const link = createLink({
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
    const link = createLink({ Href: '/download', Download: 'guide.pdf' });

    expect(link.unsafeElement.download).toBe('guide.pdf');

    link.setProperties({ Href: '', Download: '', AccessibleLabel: '' });

    expect(link.unsafeElement.hasAttribute('href')).toBe(false);
    expect(link.unsafeElement.hasAttribute('download')).toBe(false);
    expect(link.unsafeElement.hasAttribute('aria-label')).toBe(false);
  });

  it.each(['javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'data:text/html,unsafe'])(
    'rejects unsafe destination %s without corrupting the current href',
    (href) => {
      const link = createLink({ Href: '/safe' });

      expect(() => link.setProperties({ Href: href })).toThrow(/Unsupported link URL protocol/);
      expect(link.Href).toBe('/safe');
      expect(link.unsafeElement.getAttribute('href')).toBe('/safe');
    },
  );

  it.each(['mailto:hello@example.com', 'tel:+15555550123', 'https://example.com/guide'])(
    'preserves supported destination %s',
    (Href) => {
      const link = createLink({ Href });
      expect(link.unsafeElement.getAttribute('href')).toBe(Href);
      link.destroy();
    },
  );

  it('rejects GUI children that would create invalid interactive nesting', () => {
    const link = createLink();

    expect(() => (createFrame().Parent = link)).toThrow(/cannot contain GUI children/);
  });
});
