import { describe, expect, it } from 'vitest';

import { fk } from '../../../index';
import { resetDocumentAfterEach } from '../../support/reset-document';

resetDocumentAfterEach();

describe('UI padding', () => {
  it('applies, updates, and removes padding on its parent', () => {
    const frame = fk.createFrame();
    const padding = fk.createUIPadding({
      PaddingTop: fk.udim(0, 8),
      PaddingRight: fk.udim(0.1, 4),
      PaddingBottom: fk.udim(0, 12),
      PaddingLeft: fk.udim(0, 16),
    });

    padding.Parent = frame;

    expect(frame.unsafeElement.style.paddingTop).toBe('8px');
    expect(frame.unsafeElement.style.paddingRight).toBe('calc(10% + 4px)');
    expect(frame.unsafeElement.style.paddingBottom).toBe('12px');
    expect(frame.unsafeElement.style.paddingLeft).toBe('16px');

    padding.setProperties({ PaddingLeft: fk.udim(0, 24) });

    expect(frame.unsafeElement.style.paddingLeft).toBe('24px');

    padding.Parent = undefined;

    expect(frame.unsafeElement.style.paddingTop).toBe('');
    expect(frame.unsafeElement.style.paddingRight).toBe('');
    expect(frame.unsafeElement.style.paddingBottom).toBe('');
    expect(frame.unsafeElement.style.paddingLeft).toBe('');
  });

  it('composes with list layouts without replacing their styles', () => {
    const frame = fk.createFrame();
    const padding = fk.createUIPadding({ PaddingLeft: fk.udim(0, 10) });
    const layout = fk.createUIListLayout({ Padding: fk.udim(0, 6) });

    padding.Parent = frame;
    layout.Parent = frame;

    expect(frame.unsafeElement.style.paddingLeft).toBe('10px');
    expect(frame.unsafeElement.style.display).toBe('flex');
    expect(frame.unsafeElement.style.gap).toBe('6px');

    layout.Parent = undefined;

    expect(frame.unsafeElement.style.paddingLeft).toBe('10px');
    expect(frame.unsafeElement.style.display).toBe('');
  });
});
