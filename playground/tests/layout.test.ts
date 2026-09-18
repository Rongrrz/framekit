import { fk } from 'framekit';
import { describe, expect, it } from 'vitest';

import { bindLayoutProperties, type PlaygroundLayout } from '../src/layout';

describe('playground layout', () => {
  it('applies layout patches immediately and only for the owner lifetime', () => {
    const owner = fk.createFrame();
    const frame = fk.createFrame();
    const layout = fk.createValue<PlaygroundLayout>('desktop');
    bindLayoutProperties(owner, layout, frame, {
      desktop: { Size: fk.udim2FromOffset(400, 200), Visible: true },
      mobile: { Size: fk.udim2FromOffset(200, 300), Visible: false },
    });
    expect(frame.Size).toEqual(fk.udim2FromOffset(400, 200));
    layout.set('mobile');
    expect(frame.Size).toEqual(fk.udim2FromOffset(200, 300));
    expect(frame.Visible).toBe(false);
    owner.destroy();
    layout.set('desktop');
    expect(frame.Size).toEqual(fk.udim2FromOffset(200, 300));
    expect(frame.isDestroyed()).toBe(false);
    frame.destroy();
  });
});
