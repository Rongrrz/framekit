import { describe, expect, it } from 'vitest';

import { fk } from '../..';
import { resetDocumentAfterEach } from '../helpers/reset-document';

const { append, createFrame, createUIListLayout, createUIPadding, detach, udim, update } = fk;

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
    append(frame, padding);

    expect(frame.element.style.paddingTop).toBe('8px');
    expect(frame.element.style.paddingRight).toBe('calc(10% + 4px)');
    expect(frame.element.style.paddingBottom).toBe('12px');
    expect(frame.element.style.paddingLeft).toBe('16px');

    update(padding, { PaddingLeft: udim(0, 24) });
    expect(frame.element.style.paddingLeft).toBe('24px');

    detach(padding);
    expect(frame.element.style.paddingTop).toBe('');
    expect(frame.element.style.paddingRight).toBe('');
    expect(frame.element.style.paddingBottom).toBe('');
    expect(frame.element.style.paddingLeft).toBe('');
  });

  it('composes with list layouts without replacing their styles', () => {
    const frame = createFrame();
    const padding = createUIPadding({ PaddingLeft: udim(0, 10) });
    const layout = createUIListLayout({ Padding: udim(0, 6) });
    append(frame, padding);
    append(frame, layout);

    expect(frame.element.style.paddingLeft).toBe('10px');
    expect(frame.element.style.display).toBe('flex');
    expect(frame.element.style.gap).toBe('6px');

    detach(layout);
    expect(frame.element.style.paddingLeft).toBe('10px');
    expect(frame.element.style.display).toBe('');
  });
});
