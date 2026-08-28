import { describe, expect, it } from 'vitest';

import { fk, fkh } from '../..';

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
    const shadow = fk.createUIShadow();

    fkh.setModifierAttached(first, shadow, true);

    expect(shadow.Parent).toBe(first);

    fkh.setModifierAttached(first, shadow, false);

    expect(shadow.Parent).toBeUndefined();
    expect(() => fkh.setModifierAttached(first, shadow, 'yes' as never)).toThrow(/Attached/);

    shadow.Parent = second;
    fkh.setModifierAttached(first, shadow, false);

    expect(shadow.Parent).toBe(second);
  });
});
