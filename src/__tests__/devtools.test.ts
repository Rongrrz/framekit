import { createFrame, createTextButton, spring } from 'framekit';
import { createRuntimeInspector, inspectInstance } from 'framekit/devtools';
import { expect, it, vi } from 'vitest';

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

it('uses the inspected document and removes its styles, picking listeners, and refresh timer', () => {
  vi.useFakeTimers();
  const root = createFrame();
  const inspector = createRuntimeInspector(root);
  expect(inspector.gui.unsafeElement.ownerDocument).toBe(root.unsafeElement.ownerDocument);
  expect(vi.getTimerCount()).toBe(1);
  const styles = [...document.head.querySelectorAll('style')].filter((style) =>
    style.textContent?.includes('[data-fk-debug-panel]'),
  );
  expect(styles).toHaveLength(1);
  inspector.gui.destroy();
  expect(vi.getTimerCount()).toBe(0);
  expect(styles[0]!.isConnected).toBe(false);
  root.destroy();
  vi.useRealTimers();
});

it('keeps a subtree inspector in its own document and does not navigate above its supplied root', () => {
  const iframe = document.body.appendChild(document.createElement('iframe'));
  const ownerDocument = iframe.contentDocument!;
  const outside = createFrame({ Name: 'Outside' }, { ownerDocument });
  const scoped = createFrame({ Name: 'ScopedRoot' }, { ownerDocument });
  scoped.Parent = outside;
  const child = createTextButton({ Name: 'Nested' }, { ownerDocument });
  child.Parent = scoped;
  const inspector = createRuntimeInspector(scoped);
  inspector.gui.mount(ownerDocument.body);
  inspector.select(scoped);
  expect(inspector.gui.unsafeElement.ownerDocument).toBe(ownerDocument);
  expect(
    inspector.gui.unsafeElement.querySelectorAll('[aria-label^="Inspect ancestor"]'),
  ).toHaveLength(0);
  inspector.select(child);
  expect(
    inspector.gui.unsafeElement.querySelectorAll('[aria-label^="Inspect ancestor"]'),
  ).toHaveLength(1);
  expect(() => inspector.select(outside)).toThrow(/hierarchy/);
  outside.destroy();
  expect(inspector.gui.isDestroyed()).toBe(true);
  iframe.remove();
});
