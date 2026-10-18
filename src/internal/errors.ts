/** Preserves a single failure and aggregates independent failures without hiding any of them. */
export function throwCollectedErrors(errors: readonly unknown[], message: string): void {
  if (errors.length === 1) {
    throw errors[0];
  }

  if (errors.length > 1) {
    throw new AggregateError(errors, message);
  }
}

/** Releases independent resources even when an earlier cleanup fails. */
export function runCleanups(cleanups: Iterable<() => void>, message: string): void {
  const errors: unknown[] = [];

  for (const cleanup of cleanups) {
    try {
      cleanup();
    } catch (error) {
      errors.push(error);
    }
  }

  throwCollectedErrors(errors, message);
}

/** Reports an observer failure without changing the outcome of the operation it observed. */
export function reportObserverError(error: unknown): void {
  const reporter = Reflect.get(globalThis, 'reportError');

  if (typeof reporter === 'function') {
    Reflect.apply(reporter, globalThis, [error]);

    return;
  }

  console.error('Unhandled FrameKit observer error.', error);
}
