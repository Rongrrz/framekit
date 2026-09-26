import * as framekit from 'framekit';
import { describe, expect, it } from 'vitest';

describe('package API', () => {
  it('exposes the named public functions', () => {
    expect(framekit).toMatchObject({
      bindPopover: expect.any(Function),
      bindTooltip: expect.any(Function),
      createFrame: expect.any(Function),
      createUIGridLayout: expect.any(Function),
      createObservableValue: expect.any(Function),
      createSignalEmitter: expect.any(Function),
      installFrameKitStyles: expect.any(Function),
      spring: expect.any(Function),
    });
  });
});
