import { vi } from 'vitest';

export type TestAnimationClock = Readonly<{
  advance: () => void;
  settle: () => void;
}>;

/** Installs a deterministic animation frame clock for one playground test. */
export const installAnimationClock = (): TestAnimationClock => {
  const state = {
    time: 0,
    nextFrameId: 1,
    frames: new Map<number, FrameRequestCallback>(),
  };
  vi.stubGlobal('performance', { now: () => state.time });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const frameId = state.nextFrameId;
    state.nextFrameId += 1;
    state.frames.set(frameId, callback);
    return frameId;
  });
  vi.stubGlobal('cancelAnimationFrame', (frameId: number) => state.frames.delete(frameId));

  const advance = (): void => {
    state.time += 1000 / 60;
    const frames = Array.from(state.frames.values());
    state.frames.clear();
    for (const frame of frames) frame(state.time);
  };
  const settle = (): void => {
    for (let frame = 0; frame < 300 && state.frames.size > 0; frame += 1) advance();
  };
  return { advance, settle };
};
