import { describe, expect, it } from 'vitest';

import { fk } from '../../../index';

describe('shared stylesheet installation', () => {
  it('installs one nonce-authorized stylesheet before factories run', () => {
    const ownerDocument = document.implementation.createHTMLDocument();
    const options = { ownerDocument, nonce: 'server-generated-nonce' };

    fk.installStyles(options);
    const button = fk.createTextButton({}, { ownerDocument });
    fk.installStyles(options);

    const styles = ownerDocument.querySelectorAll<HTMLStyleElement>('[data-framekit-styles]');

    expect(styles).toHaveLength(1);
    expect(styles[0]?.nonce).toBe(options.nonce);
    expect(styles[0]?.textContent).toContain('::placeholder');
    expect(styles[0]?.textContent).toContain('::-webkit-scrollbar');
    expect(() => fk.installStyles({ ownerDocument, nonce: 'different' })).toThrow(
      /before creating nodes/,
    );

    button.destroy();
  });

  it('reinstalls a stylesheet that was removed instead of trusting stale installation state', () => {
    const ownerDocument = document.implementation.createHTMLDocument();

    fk.installStyles({ ownerDocument });
    ownerDocument.querySelector('[data-framekit-styles]')!.remove();
    fk.installStyles({ ownerDocument });

    expect(ownerDocument.querySelectorAll('[data-framekit-styles]')).toHaveLength(1);
  });
});
