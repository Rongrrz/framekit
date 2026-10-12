import { createFrame, createTextButton, spring } from 'framekit';
import { createRuntimeInspector, inspectInstance } from 'framekit/devtools';
import { expect, it } from 'vitest';

it('returns readonly snapshots and reports animation claims through destruction', () => {
  const frame = createFrame();
  const child = createTextButton();
  child.Parent = frame;
  spring(child, { Rotation: 30 });
  const snapshot = inspectInstance(child);
  expect(snapshot.parent).toBe(frame);
  expect(snapshot.animatedProperties).toEqual(['Rotation']);
  expect(Object.isFrozen(snapshot.properties)).toBe(true);
  child.Rotation = 12;
  expect(inspectInstance(child).animatedProperties).toEqual([]);
  frame.destroy();
  expect(inspectInstance(child).destroyed).toBe(true);
  expect(inspectInstance(child).cleanupRegistrations).toBe(0);
});

it('owns the inspector lifetime without adding it to the inspected tree', () => {
  const root = createFrame();
  const child = createTextButton();
  child.Parent = root;
  const inspector = createRuntimeInspector(root);
  inspector.select(child);
  expect(root.getChildren()).toEqual([child]);
  const foreign = createFrame();
  expect(() => inspector.select(foreign)).toThrow(/hierarchy/);
  root.destroy();
  expect(inspector.gui.isDestroyed()).toBe(true);
  foreign.destroy();
});
