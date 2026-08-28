import { describe, expect, it } from 'vitest';

import { fk, fkh } from '..';

describe('public helpers', () => {
  it('binds a retained hover scale', () => {
    const frame = fk.createFrame();
    const scale = fkh.bindHoverScale(frame, 1.05);

    expect(scale.ClassName).toBe('UIScale');
    expect(scale.Parent).toBe(frame);
    expect(() => fkh.bindHoverScale(frame, -1)).toThrow(/Hovered scale/);
  });

  it('attaches and detaches a retained modifier from the requested parent', () => {
    const first = fk.createFrame({ Name: 'First' });
    const second = fk.createFrame({ Name: 'Second' });
    const glow = fk.createUIGlow();

    fkh.setModifierAttached(first, glow, true);
    expect(glow.Parent).toBe(first);

    fkh.setModifierAttached(first, glow, false);
    expect(glow.Parent).toBeUndefined();
    expect(() => fkh.setModifierAttached(first, glow, 'yes' as never)).toThrow(/Attached/);

    glow.Parent = second;
    fkh.setModifierAttached(first, glow, false);
    expect(glow.Parent).toBe(second);
  });
});
