import { describe, expect, it } from 'vitest';

import { fk, fkh } from '../../index';

describe('hover scale', () => {
  it('binds a retained hover scale', () => {
    const frame = fk.createFrame();
    const scale = fkh.bindHoverScale(frame, 1.05);

    expect(scale.ClassName).toBe('UIScale');
    expect(scale.Parent).toBe(frame);
    expect(() => fkh.bindHoverScale(frame, -1)).toThrow(/Hovered scale/);
  });
});
