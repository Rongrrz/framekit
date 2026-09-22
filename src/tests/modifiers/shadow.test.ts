import { describe, expect, it } from 'vitest';

import { createFrame, createUIShadow } from '../../index.js';

describe('shadows', () => {
  it('validates shadow geometry', () => {
    const frame = createFrame();
    const shadow = createUIShadow();

    shadow.Parent = frame;

    expect(() => shadow.setProperties({ BlurRadius: -1 })).toThrow(/BlurRadius/);
    expect(shadow.BlurRadius).toBe(16);
  });
});
