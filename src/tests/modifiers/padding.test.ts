import { describe, expect, it } from 'vitest';

import { createFrame, createUIListLayout, createUIPadding, udim } from '../../index.js';
import { resetDocumentAfterEach } from '../support/reset-document.js';

resetDocumentAfterEach();

describe('UI padding', () => {
  it('applies, updates, and removes padding on its parent', () => {
    const frame = createFrame();
    const padding = createUIPadding({
      PaddingTop: udim(0, 8),
      PaddingRight: udim(0.1, 4),
      PaddingBottom: udim(0, 12),
      PaddingLeft: udim(0, 16),
    });

    padding.Parent = frame;

    expect(frame.unsafeElement.style.paddingTop).toBe('8px');
    expect(frame.unsafeElement.style.paddingRight).toBe('calc(10% + 4px)');
    expect(frame.unsafeElement.style.paddingBottom).toBe('12px');
    expect(frame.unsafeElement.style.paddingLeft).toBe('16px');

    padding.setProperties({ PaddingLeft: udim(0, 24) });

    expect(frame.unsafeElement.style.paddingLeft).toBe('24px');

    padding.Parent = undefined;

    expect(frame.unsafeElement.style.paddingTop).toBe('');
    expect(frame.unsafeElement.style.paddingRight).toBe('');
    expect(frame.unsafeElement.style.paddingBottom).toBe('');
    expect(frame.unsafeElement.style.paddingLeft).toBe('');
  });

  it('composes with list layouts without replacing their styles', () => {
    const frame = createFrame();
    const padding = createUIPadding({ PaddingLeft: udim(0, 10) });
    const layout = createUIListLayout({ Padding: udim(0, 6) });

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
