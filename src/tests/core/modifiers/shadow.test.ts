import { describe, expect, it } from 'vitest';

import { fk } from '../../../index';

describe('shadows', () => {
  it('validates shadow geometry', () => {
    const frame = fk.createFrame();
    const shadow = fk.createUIShadow();

    frame.addChild(shadow);

    expect(() => shadow.setProperties({ BlurRadius: -1 })).toThrow(/BlurRadius/);
    expect(shadow.BlurRadius).toBe(16);
  });
});
