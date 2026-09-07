import { describe, expect, it } from 'vitest';

import { fk, fkh } from '../../index';
import { resetDocumentAfterEach } from '../support/reset-document';

resetDocumentAfterEach();

describe('automatic vertical scrolling lists', () => {
  it('creates a full-width vertical list that formats appended children', () => {
    const list = fkh.createAutoYScrollingFrame({
      viewportHeight: fk.udim(0.5, -20),
      gap: 12,
    });
    const first = fk.createFrame({
      Size: fk.udim2FromOffset(80, 32),
      Position: fk.udim2FromOffset(20, 40),
    });
    const second = fk.createFrame({ Size: fk.udim2FromOffset(60, 48) });

    list.addChild(first);
    list.addChild(second);

    expect(list.Size).toEqual(fk.udim2(1, 0, 0.5, -20));
    expect(list.ScrollingDirection).toBe('Y');
    expect(list.CanvasSize).toEqual(fk.udim2(1, 0, 0, 0));
    expect(list.AutomaticCanvasSize).toBe('Y');
    expect(list.element.style.display).toBe('flex');
    expect(list.element.style.flexDirection).toBe('column');
    expect(list.element.style.gap).toBe('12px');
    expect(first.element.style.position).toBe('relative');
    expect(first.element.style.left).toBe('auto');
    expect(first.element.style.top).toBe('auto');
    expect(first.element.style.width).toBe('100%');
    expect(first.element.style.height).toBe('32px');
    expect(second.element.style.width).toBe('100%');
    expect(second.element.style.height).toBe('48px');

    first.Size = fk.udim2FromOffset(20, 56);

    expect(first.element.style.width).toBe('100%');
    expect(first.element.style.height).toBe('56px');
  });

  it('rejects invalid automatic vertical list measurements', () => {
    expect(() =>
      fkh.createAutoYScrollingFrame({
        viewportHeight: { Scale: 0, Offset: Number.NaN },
      }),
    ).toThrow(/UDim offset/);
    expect(() =>
      fkh.createAutoYScrollingFrame({ viewportHeight: fk.udim(0, 200), gap: -1 }),
    ).toThrow(/Gap/);
  });
});
