type Key = string | number;

export type RowMeasurement = Readonly<{ key: Key; height: number }>;

export type RowObserver = Readonly<{
  observeRow(element: HTMLElement, key: Key): void;
  unobserveRow(element: HTMLElement): void;
  dispose(): void;
}>;

/** Coalesces native border-box measurements without writing observed ancestors during delivery. */
export const observeVirtualRows = (
  viewport: HTMLElement,
  measureRows: boolean,
  apply: (changes: readonly RowMeasurement[]) => void,
): RowObserver => {
  const window = viewport.ownerDocument.defaultView ?? globalThis;

  const Constructor =
    viewport.ownerDocument.defaultView?.ResizeObserver ?? globalThis.ResizeObserver;

  if (typeof Constructor !== 'function') {
    throw new Error('Virtual lists require ResizeObserver.');
  }

  const rows = new WeakMap<Element, Key>();
  const pending = new Map<Key, number>();
  let frame: number | undefined;
  let disposed = false;

  const observer = new Constructor((changes) => {
    if (disposed) {
      return;
    }

    if (!measureRows) {
      apply([]);

      return;
    }

    for (const change of changes) {
      const key = rows.get(change.target);

      if (key !== undefined) {
        pending.set(
          key,
          change.borderBoxSize?.[0]?.blockSize ?? (change.target as HTMLElement).offsetHeight,
        );
      }
    }

    frame ??= window.requestAnimationFrame(() => {
      frame = undefined;

      const batch = [...pending].map(([key, height]) => ({ key, height }));
      pending.clear();
      apply(batch);
    });
  });

  observer.observe(viewport);

  return {
    observeRow: (element, key): void => {
      if (measureRows) {
        rows.set(element, key);
        observer.observe(element, { box: 'border-box' });
      }
    },

    unobserveRow: (element): void => {
      const key = rows.get(element);
      rows.delete(element);

      if (key !== undefined) {
        pending.delete(key);
      }

      observer.unobserve(element);
    },

    dispose: (): void => {
      disposed = true;
      observer.disconnect();

      if (frame !== undefined) {
        window.cancelAnimationFrame(frame);
      }

      pending.clear();
    },
  };
};
