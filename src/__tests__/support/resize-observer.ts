import { vi } from 'vitest';

/** Delivers geometry only to connected observations, using the test's native size stubs. */
export const installResizeObserver = (): (() => void) => {
  const observations = new Map<
    ResizeObserver,
    { callback: ResizeObserverCallback; targets: Set<Element> }
  >();

  class TestResizeObserver implements ResizeObserver {
    public constructor(callback: ResizeObserverCallback) {
      observations.set(this, { callback, targets: new Set() });
    }

    public observe(target: Element): void {
      observations.get(this)!.targets.add(target);
    }

    public unobserve(target: Element): void {
      observations.get(this)!.targets.delete(target);
    }

    public disconnect(): void {
      observations.get(this)!.targets.clear();
    }
  }

  vi.stubGlobal('ResizeObserver', TestResizeObserver);

  return () => {
    for (const [observer, { callback, targets }] of observations) {
      const entries = [...targets].map((target): ResizeObserverEntry => {
        const contentRect = target.getBoundingClientRect();
        const size = {
          inlineSize: (target as HTMLElement).offsetWidth,
          blockSize: (target as HTMLElement).offsetHeight,
        };

        return {
          target,
          contentRect,
          borderBoxSize: [size],
          contentBoxSize: [size],
          devicePixelContentBoxSize: [size],
        };
      });

      if (entries.length > 0) {
        callback(entries, observer);
      }
    }
  };
};
