import { describe, expect, it } from 'vitest';

import { color3, createFrame, fk, state } from '..';

describe('package API', () => {
  it('supports both named imports and the fk namespace', () => {
    expect(createFrame).toBe(fk.createFrame);
    expect(color3).toBe(fk.color3);
    expect(state.observable).toBe(fk.state.observable);
  });
});
