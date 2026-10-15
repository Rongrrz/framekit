import {
  createFrame,
  createScreenGui,
  createUIListLayout,
  udim2FromOffset,
  type Frame,
  type ScreenGui,
} from 'framekit';

export type RuntimeWorkload = 'patch' | 'destroy' | 'destroy-resources';
type Fixture = Readonly<{
  root: ScreenGui;
  rows: readonly Frame[];
  kind: RuntimeWorkload;
  count: number;
  cleanups: () => number;
}>;
let fixture: Fixture | undefined;

/** Setup stays outside the CPU recording so teardown samples do not measure construction. */
export const prepareRuntimeProfile = (kind: RuntimeWorkload, count: number): void => {
  disposeRuntimeProfile();
  const root = createScreenGui();
  const parent = createFrame({ Size: udim2FromOffset(800, count * 10) });
  parent.Parent = root;
  let cleanups = 0;
  const rows = Array.from({ length: count }, () => {
    const row = createFrame({ Size: udim2FromOffset(800, 10) });
    if (kind === 'destroy-resources') {
      row.onMouseEnter(() => undefined);
      row.onPropertyChanged('Rotation', () => undefined);
      row.onDestroy(() => {
        cleanups += 1;
      });
    }
    row.Parent = parent;
    return row;
  });
  createUIListLayout().Parent = parent;
  root.mount('#root');
  parent.unsafeElement.getBoundingClientRect();
  fixture = { root, rows, kind, count, cleanups: () => cleanups };
};

/** Only the requested operation and its layout flush run inside the recording. */
export const runRuntimeProfile = (): Readonly<{ elapsedMs: number; operations: number }> => {
  if (!fixture) {
    throw new Error('Prepare a runtime profile first.');
  }
  const started = performance.now();
  if (fixture.kind === 'patch') {
    for (let iteration = 0; iteration < 31; iteration += 1) {
      for (const row of fixture.rows) {
        row.setProperties({
          Rotation: (iteration % 2) + 1,
          Size: udim2FromOffset(800, (iteration % 2) + 10),
          BackgroundTransparency: (iteration % 2) / 2,
        });
      }
      fixture.root.unsafeElement.getBoundingClientRect();
    }
  } else {
    fixture.root.destroy();
    document.querySelector('#root')!.getBoundingClientRect();
  }
  return {
    elapsedMs: performance.now() - started,
    operations: fixture.kind === 'patch' ? 31 * fixture.count : fixture.count,
  };
};

/** Verification is deliberately outside CPU sampling and never relaxes cleanup contracts. */
export const verifyRuntimeProfile = (): void => {
  if (!fixture) {
    throw new Error('Prepare a runtime profile first.');
  }
  if (fixture.kind === 'patch') {
    if (
      fixture.rows.some(
        (row) => row.Rotation !== 1 || row.Size.Y.Offset !== 10 || row.BackgroundTransparency !== 0,
      )
    ) {
      throw new Error('Property patch was not committed.');
    }
  } else if (
    !fixture.root.isDestroyed() ||
    document.querySelector('#root')!.childElementCount ||
    (fixture.kind === 'destroy-resources' && fixture.cleanups() !== fixture.count)
  ) {
    throw new Error('Teardown left owned resources or DOM.');
  }
};

export const disposeRuntimeProfile = (): void => {
  fixture?.root.destroy();
  fixture = undefined;
};
