import { createFrame, createTextButton, createUIListLayout } from 'framekit';
import { expect, it } from 'vitest';

it('reorders the exact hierarchy and rejects missing, duplicate, or foreign children', () => {
  const parent = createFrame();
  const children = Array.from({ length: 3 }, (_, index) =>
    createTextButton({ Name: String(index) }),
  );
  children.forEach((child) => {
    child.Parent = parent;
  });
  parent.reorderChildren([...children].reverse());
  expect(parent.getChildren()).toEqual([...children].reverse());
  expect([...parent.unsafeElement.children]).toEqual(
    [...children].reverse().map((child) => child.unsafeElement),
  );
  expect(() => parent.reorderChildren(children.slice(1))).toThrow(/exactly once/);
  expect(() => parent.reorderChildren([children[0]!, children[0]!, children[2]!])).toThrow(
    /exactly once/,
  );
  const foreign = createFrame();
  expect(() => parent.reorderChildren([children[0]!, foreign, children[2]!])).toThrow(
    /exactly once/,
  );
  expect(parent.getChildren()).toEqual([...children].reverse());
  parent.destroy();
  foreign.destroy();
});

it('aligns DOM and visual layout order while preserving explicit hierarchy order', () => {
  const parent = createFrame();
  const first = createTextButton({ LayoutOrder: 2 });
  const second = createTextButton({ LayoutOrder: 1 });
  first.Parent = parent;
  second.Parent = parent;
  const layout = createUIListLayout();
  layout.Parent = parent;
  expect(parent.getChildren()).toEqual([first, second, layout]);
  expect([...parent.unsafeElement.children]).toEqual([second.unsafeElement, first.unsafeElement]);
  first.LayoutOrder = 0;
  expect([...parent.unsafeElement.children]).toEqual([first.unsafeElement, second.unsafeElement]);
  first.LayoutOrder = 3;
  layout.destroy();
  expect([...parent.unsafeElement.children]).toEqual([first.unsafeElement, second.unsafeElement]);
  parent.destroy();
});

it('preserves tree ownership through deterministic sequences of moves and reorders', () => {
  const root = createFrame();
  const parents = [createFrame(), createFrame()];
  parents.forEach((parent) => {
    parent.Parent = root;
  });
  const nodes = Array.from({ length: 12 }, () => createFrame());
  nodes.forEach((node) => {
    node.Parent = parents[0]!;
  });
  for (let step = 0; step < 100; step += 1) {
    nodes[(step * 7) % nodes.length]!.Parent = parents[step % 2]!;
    const parent = parents[step % 2]!;
    parent.reorderChildren([...parent.getChildren()].reverse());
    for (const candidate of parents) {
      for (const child of candidate.getChildren()) {
        expect(child.Parent).toBe(candidate);
      }
      expect(candidate.unsafeElement.childElementCount).toBe(candidate.getChildren().length);
    }
    expect(new Set(root.getDescendants()).size).toBe(nodes.length + parents.length);
  }
  root.destroy();
});
