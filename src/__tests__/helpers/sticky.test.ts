import { bindSticky, createFrame, createUIListLayout, udim2FromOffset } from 'framekit';
import { describe, expect, it } from 'vitest';

describe('sticky placement', () => {
  it('restores parent layout placement and the latest preferred Position when released', () => {
    const row = createFrame();
    const layout = createUIListLayout({ FillDirection: 'Horizontal' });
    layout.Parent = row;
    const target = createFrame({ Position: udim2FromOffset(20, 30) });
    target.Parent = row;
    const release = bindSticky(target, { inset: 12 });
    target.Position = udim2FromOffset(40, 50);

    expect(target.unsafeElement.style.position).toBe('sticky');
    expect(target.unsafeElement.style.top).toBe('12px');
    release();
    expect(target.unsafeElement.style.position).toBe('relative');
    expect(target.unsafeElement.style.top).toBe('auto');
    layout.destroy();
    expect(target.unsafeElement.style.position).toBe('absolute');
    expect(target.unsafeElement.style.top).toBe('50px');
    row.destroy();
  });

  it('replaces a binding without letting stale disposers remove the current placement', () => {
    const target = createFrame();
    const other = createFrame();
    const first = bindSticky(target, { inset: 4 });
    const second = bindSticky(target, { inset: 24 });
    first();

    expect(target.unsafeElement.style.top).toBe('24px');
    expect(other.unsafeElement.style.position).toBe('absolute');
    target.destroy();
    second();
    expect(() => bindSticky(target)).toThrow(/destroyed/);
    other.destroy();
  });

  it.each([-1, NaN, Infinity])(
    'rejects an invalid inset without replacing the current binding: %s',
    (inset) => {
      const target = createFrame();
      bindSticky(target, { inset: 8 });
      expect(() => bindSticky(target, { inset })).toThrow(/inset/);
      expect(target.unsafeElement.style.top).toBe('8px');
      target.destroy();
    },
  );
});
