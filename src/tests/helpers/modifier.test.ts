import { describe, expect, it } from 'vitest';

import { fk, fkh } from '../../index';

describe('modifier attachment helper', () => {
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
