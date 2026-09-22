import { describe, expect, it } from 'vitest';

import * as framekit from '../index.js';

describe('package API', () => {
  it('exposes one named-export surface without compatibility namespaces', () => {
    expect(framekit).toMatchObject({
      createFrame: expect.any(Function),
      spring: expect.any(Function),
      withPopover: expect.any(Function),
    });
    expect(framekit).not.toHaveProperty('fk');
    expect(framekit).not.toHaveProperty('fka');
    expect(framekit).not.toHaveProperty('fkh');
  });
});
