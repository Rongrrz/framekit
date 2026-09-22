import { describe, expect, it } from 'vitest';

import * as framekit from '../index.js';

describe('package API', () => {
  it('exposes the named public functions', () => {
    expect(framekit).toMatchObject({
      bindPopover: expect.any(Function),
      bindTooltip: expect.any(Function),
      createFrame: expect.any(Function),
      createObservableValue: expect.any(Function),
      createSignalEmitter: expect.any(Function),
      installFrameKitStyles: expect.any(Function),
      spring: expect.any(Function),
    });
  });
});
