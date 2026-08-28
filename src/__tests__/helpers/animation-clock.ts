import { afterEach, beforeEach, vi } from 'vitest';

type AnimationClock = Readonly<{
  advance(milliseconds?: number): void;
  settle(maximumFrames?: number): void;
}>;

const frameDuration = 1000 / 60;

/** Installs a deterministic animation-frame clock for the surrounding test suite. */
export function setupAnimationClock(): AnimationClock {
  let time = 0;
  let nextFrameId = 1;
  let pendingFrames = new Map<number, FrameRequestCallback>();

  beforeEach(() => {
    time = 0;
    nextFrameId = 1;
    pendingFrames = new Map();
    vi.stubGlobal('performance', { now: () => time });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      pendingFrames.set(frameId, callback);
      return frameId;
    });
    vi.stubGlobal('cancelAnimationFrame', (frameId: number) => pendingFrames.delete(frameId));
  });

  afterEach(() => vi.unstubAllGlobals());

  function advance(milliseconds = frameDuration): void {
    time += milliseconds;
    const framesToRun = Array.from(pendingFrames.values());
    pendingFrames.clear();
    for (const callback of framesToRun) callback(time);
  }

  function settle(maximumFrames = 300): void {
    for (let frame = 0; frame < maximumFrames && pendingFrames.size > 0; frame += 1) {
      advance();
    }
  }

  return { advance, settle };
}
