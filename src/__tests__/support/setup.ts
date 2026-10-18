import { afterEach, beforeEach, expect, vi } from 'vitest';

const observerErrors: unknown[] = [];

beforeEach(() => {
  observerErrors.length = 0;
  vi.stubGlobal('reportError', (error: unknown) => observerErrors.push(error));
});

afterEach(() => {
  try {
    expect(observerErrors, 'Unexpected FrameKit observer failures').toEqual([]);
  } finally {
    globalThis.document?.body.replaceChildren();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
