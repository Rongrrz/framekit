import { lifetimeSummary, runLifetime, sampleDocuments } from './lifecycle.js';
import { createSearchApplication } from './responsiveness.js';

type InputTiming = Readonly<{
  kind: 'filter' | 'scroll';
  handlerMs: number | null;
  presentationEstimateMs: number;
}>;
const samples: InputTiming[] = [];
const eventTimings: {
  name: string;
  duration: number;
  inputDelayMs: number;
  processingMs: number;
  interactionId: number;
}[] = [];
const longTasks: number[] = [];
const observers: PerformanceObserver[] = [];

/** Browser event timestamps include queued input; a second frame provides a presentation estimate. */
const startResponsiveness = (): void => {
  const app = createSearchApplication();
  const starts = new WeakMap<Event, number>();
  const capture = (event: Event): void => {
    starts.set(event, performance.now());
  };
  const listen = (event: Event): void => {
    const kind = event.type === 'input' ? 'filter' : 'scroll';
    const started = starts.get(event);
    const handlerMs = started === undefined ? null : performance.now() - started;
    const eventTime = event.timeStamp;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        samples.push({ kind, handlerMs, presentationEstimateMs: performance.now() - eventTime });
      }),
    );
  };
  document.addEventListener('input', capture, true);
  document.addEventListener('input', listen);
  document.addEventListener('scroll', listen, true);
  if (PerformanceObserver.supportedEntryTypes.includes('event')) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceEventTiming[]) {
        eventTimings.push({
          name: entry.name,
          duration: entry.duration,
          inputDelayMs: entry.processingStart - entry.startTime,
          processingMs: entry.processingEnd - entry.processingStart,
          interactionId: entry.interactionId,
        });
      }
    });
    // The browser supports durationThreshold before TypeScript's DOM definitions include it.
    const eventOptions = { type: 'event', durationThreshold: 16, buffered: true };
    observer.observe(eventOptions);
    observers.push(observer);
  }
  if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
    const observer = new PerformanceObserver((list) =>
      longTasks.push(...list.getEntries().map((entry) => entry.duration)),
    );
    observer.observe({ type: 'longtask' });
    observers.push(observer);
  }
  window.addEventListener(
    'pagehide',
    () => {
      app.destroy();
      observers.forEach((observer) => observer.disconnect());
      document.removeEventListener('input', capture, true);
      document.removeEventListener('input', listen);
      document.removeEventListener('scroll', listen, true);
    },
    { once: true },
  );
};

const resetResponsiveness = (): void => {
  observers.forEach((observer) => observer.takeRecords());
  samples.length = 0;
  eventTimings.length = 0;
  longTasks.length = 0;
};
const diagnostics = {
  runLifetime,
  sampleDocuments,
  lifetimeSummary,
  startResponsiveness,
  resetResponsiveness,
  responsivenessSummary: () => ({
    samples: [...samples],
    eventTimings: [...eventTimings],
    longTasks: [...longTasks],
    mountedViews: document.querySelectorAll('[role="option"]').length,
    resultCount: document.querySelector('[role="status"]')?.textContent,
  }),
};

declare global {
  interface Window {
    framekitDiagnostics: typeof diagnostics;
  }
  interface PerformanceEventTiming {
    readonly interactionId: number;
  }
}
window.framekitDiagnostics = diagnostics;
