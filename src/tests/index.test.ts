import { describe, expect, it } from 'vitest';

import { fk, fka, fkh } from '../index.js';
import * as framekit from '../index.js';

describe('package API', () => {
  it('separates core, animation, and helper namespaces', () => {
    expect(Object.keys(framekit).sort()).toEqual(['fk', 'fka', 'fkh']);
    expect(Object.keys(fka).sort()).toEqual(['createTween', 'spring']);
    expect(Object.keys(fkh).sort()).toEqual([
      'bindHoverScale',
      'bindResponsiveLayout',
      'withPopover',
      'withToolTip',
    ]);
    for (const name of [...Object.keys(fka), ...Object.keys(fkh)]) {
      expect(fk).not.toHaveProperty(name);
    }
  });
});
