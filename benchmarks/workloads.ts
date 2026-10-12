import {
  bindVirtualList,
  createFrame,
  createObservableValue,
  createScreenGui,
  createScrollingFrame,
  createTextLabel,
  createTween,
  createUIListLayout,
  udim2FromOffset,
} from '../src/index.js';

type Runtime = 'framekit' | 'dom';
type Sample = Readonly<{
  creationMs: number;
  updateMs: number;
  reorderMs: number;
  destructionMs: number;
}>;
const percentile = (values: readonly number[], fraction: number): number =>
  [...values].sort((left, right) => left - right)[
    Math.min(values.length - 1, Math.floor(values.length * fraction))
  ] ?? 0;
const rounded = (value: number): number => Math.round(value * 1000) / 1000;
const time = (run: () => void): number => {
  const start = performance.now();
  run();
  return performance.now() - start;
};
const host = (): HTMLElement => document.querySelector<HTMLElement>('#root')!;

const runSynchronous = (runtime: Runtime, count: number): Sample => {
  if (runtime === 'framekit') {
    const gui = createScreenGui();
    gui.mount(host());
    const parent = createFrame({ Size: udim2FromOffset(800, count * 10) });
    parent.Parent = gui;
    const nodes: ReturnType<typeof createFrame>[] = [];
    const creationMs = time(() => {
      for (let index = 0; index < count; index += 1) {
        const node = createFrame({ Size: udim2FromOffset(800, 10) });
        node.Parent = parent;
        nodes.push(node);
      }
      // Attach layout after initial construction rather than repeatedly laying out a growing tree.
      createUIListLayout().Parent = parent;
      parent.unsafeElement.getBoundingClientRect();
    });
    const updateMs = time(() => {
      nodes.forEach((node, index) => {
        node.Rotation = (index % 9) + 1;
      });
      parent.unsafeElement.getBoundingClientRect();
    });
    const reorderMs = time(() => {
      parent.reorderChildren([...parent.getChildren()].reverse());
      parent.unsafeElement.getBoundingClientRect();
    });
    const destructionMs = time(() => {
      gui.destroy();
      host().getBoundingClientRect();
    });
    return { creationMs, updateMs, reorderMs, destructionMs };
  }
  const parent = document.createElement('div');
  Object.assign(parent.style, {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    width: '800px',
    height: `${count * 10}px`,
  });
  host().append(parent);
  const nodes: HTMLElement[] = [];
  const creationMs = time(() => {
    for (let index = 0; index < count; index += 1) {
      const node = document.createElement('div');
      Object.assign(node.style, {
        position: 'relative',
        width: '800px',
        height: '10px',
        flexShrink: '0',
        boxSizing: 'border-box',
        margin: '0',
        backgroundColor: 'rgb(200 200 200)',
      });
      parent.append(node);
      nodes.push(node);
    }
    parent.getBoundingClientRect();
  });
  const updateMs = time(() => {
    nodes.forEach((node, index) => {
      node.style.rotate = `${(index % 9) + 1}deg`;
    });
    parent.getBoundingClientRect();
  });
  const reorderMs = time(() => {
    [...nodes].reverse().forEach((node) => parent.append(node));
    parent.getBoundingClientRect();
  });
  const destructionMs = time(() => {
    parent.remove();
    host().getBoundingClientRect();
  });
  return { creationMs, updateMs, reorderMs, destructionMs };
};

const animationFrames = async (
  runtime: Runtime,
): Promise<Readonly<{ samples: number; medianMs: number; p95Ms: number; maxMs: number }>> => {
  const gui = createScreenGui();
  gui.mount(host());
  const nodes = Array.from({ length: 300 }, (_, index) => {
    const node = createFrame({
      Size: udim2FromOffset(20, 20),
      Position: udim2FromOffset((index % 30) * 22, Math.floor(index / 30) * 22),
    });
    node.Parent = gui;
    return node;
  });
  const start = performance.now();
  if (runtime === 'framekit') {
    nodes.forEach((node) =>
      createTween(node, { Duration: 0.5, EasingStyle: 'Linear' }, { Rotation: 90 }).play(),
    );
  }
  const samples: number[] = [];
  let previous = start;
  while (performance.now() - start < 650) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const now = performance.now();
    samples.push(now - previous);
    previous = now;
    if (runtime === 'dom') {
      nodes.forEach((node) => {
        node.unsafeElement.style.rotate = `${Math.min(1, (now - start) / 500) * 90}deg`;
      });
    }
  }
  gui.destroy();
  return {
    samples: samples.length,
    medianMs: rounded(percentile(samples, 0.5)),
    p95Ms: rounded(percentile(samples, 0.95)),
    maxMs: rounded(Math.max(...samples)),
  };
};

const virtualCollection = (): Readonly<{
  count: number;
  maxMountedViews: number;
  creationMs: number;
  jumpMedianMs: number;
  jumpP95Ms: number;
}> => {
  const gui = createScreenGui();
  gui.mount(host());
  const viewport = createScrollingFrame({ Size: udim2FromOffset(400, 320) });
  viewport.Parent = gui;
  const source = createObservableValue<readonly number[]>(
    Array.from({ length: 100_000 }, (_, index) => index),
  );
  const start = performance.now();
  const list = bindVirtualList(viewport, source, {
    itemHeight: 32,
    key: (id) => id,
    selection: createObservableValue<string | number | undefined>(undefined),
    create: () => createTextLabel(),
    update: (node, id) => {
      node.Text = String(id);
    },
  });
  viewport.unsafeElement.getBoundingClientRect();
  const creationMs = performance.now() - start;
  const jumps: number[] = [];
  let maxMountedViews = 0;
  for (let index = 0; index < 30; index += 1) {
    jumps.push(
      time(() => {
        list.scrollToKey(Math.min(99_999, index * 3400));
        viewport.unsafeElement.getBoundingClientRect();
      }),
    );
    maxMountedViews = Math.max(
      maxMountedViews,
      viewport.unsafeElement.querySelectorAll('[role="option"]').length,
    );
  }
  gui.destroy();
  return {
    count: 100_000,
    maxMountedViews,
    creationMs: rounded(creationMs),
    jumpMedianMs: rounded(percentile(jumps, 0.5)),
    jumpP95Ms: rounded(percentile(jumps, 0.95)),
  };
};

/** Diagnostic workloads include synchronous layout flushes, not browser paint or full applications. */
export const runBenchmarks = async (): Promise<
  Readonly<{
    synchronous: readonly Readonly<{
      count: number;
      runtime: Runtime;
      repetitions: number;
      medianMs: Sample;
    }>[];
    animation: Readonly<Record<Runtime, Awaited<ReturnType<typeof animationFrames>>>>;
    virtualCollection: ReturnType<typeof virtualCollection>;
    remainingRoots: number;
  }>
> => {
  const synchronous = [];
  for (const count of [1000, 5000]) {
    for (const runtime of ['framekit', 'dom'] as const) {
      runSynchronous(runtime, 100);
      const samples = Array.from({ length: 5 }, () => runSynchronous(runtime, count));
      const medianMs = Object.fromEntries(
        (['creationMs', 'updateMs', 'reorderMs', 'destructionMs'] as const).map((key) => [
          key,
          rounded(
            percentile(
              samples.map((sample) => sample[key]),
              0.5,
            ),
          ),
        ]),
      ) as Sample;
      synchronous.push({ count, runtime, repetitions: samples.length, medianMs });
    }
  }
  const animation = {
    framekit: await animationFrames('framekit'),
    dom: await animationFrames('dom'),
  };
  return {
    synchronous,
    animation,
    virtualCollection: virtualCollection(),
    remainingRoots: host().childElementCount,
  };
};
