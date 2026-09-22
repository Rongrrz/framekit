import { createFrame, createValue, udim2FromOffset } from 'framekit';
import { describe, expect, it } from 'vitest';

import { bindLayoutProperties, type PlaygroundLayout } from '../src/layout';

describe('playground layout', () => {
  it('applies layout patches immediately and only for the owner lifetime', () => {
    const owner = createFrame();
    const frame = createFrame();
    const layout = createValue<PlaygroundLayout>('desktop');
    bindLayoutProperties(owner, layout, frame, {
      desktop: { Size: udim2FromOffset(400, 200), Visible: true },
      mobile: { Size: udim2FromOffset(200, 300), Visible: false },
    });
    expect(frame.Size).toEqual(udim2FromOffset(400, 200));
    layout.set('mobile');
    expect(frame.Size).toEqual(udim2FromOffset(200, 300));
    expect(frame.Visible).toBe(false);
    owner.destroy();
    layout.set('desktop');
    expect(frame.Size).toEqual(udim2FromOffset(200, 300));
    expect(frame.isDestroyed()).toBe(false);
    frame.destroy();
  });
});
