import { afterEach, beforeEach, vi } from 'vitest';

type AnimationClock = Readonly<{
  advance(milliseconds?: number): void;
  settle(maximumFrames?: number): void;
}>;

const frameDuration = 1000 / 60;

/** Installs a deterministic animation-frame clock for the surrounding test suite. */
export function setupAnimationClock(): AnimationClock {
  let nowMs = 0;
  let nextFrameId = 1;
  const pendingFrames = new Map<number, FrameRequestCallback>();

  beforeEach(() => {
    nowMs = 0;
    nextFrameId = 1;
    pendingFrames.clear();

    vi.stubGlobal('performance', { now: () => nowMs });
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
    nowMs += milliseconds;

    const framesToRun = Array.from(pendingFrames.values());

    pendingFrames.clear();

    for (const callback of framesToRun) callback(nowMs);
  }

  function settle(maximumFrames = 300): void {
    for (let frame = 0; frame < maximumFrames && pendingFrames.size > 0; frame += 1) {
      advance();
    }
    if (pendingFrames.size > 0) {
      throw new Error(`Animations did not settle within ${maximumFrames} frames.`);
    }
  }

  return { advance, settle };
}
