import { describe, expect, it } from 'vitest';

import * as framekit from '../index.js';

describe('package API', () => {
  it('exposes one named-export surface without compatibility namespaces', () => {
    expect(framekit).toMatchObject({
      bindPopover: expect.any(Function),
      bindTooltip: expect.any(Function),
      createFrame: expect.any(Function),
      createObservableValue: expect.any(Function),
      createSignalEmitter: expect.any(Function),
      installFrameKitStyles: expect.any(Function),
      spring: expect.any(Function),
    });
    for (const removedExport of [
      'createSignal',
      'createValue',
      'fk',
      'fka',
      'fkh',
      'installStyles',
      'withPopover',
      'withToolTip',
    ]) {
      expect(framekit).not.toHaveProperty(removedExport);
    }
  });
});
