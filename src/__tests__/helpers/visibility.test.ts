import { bindVisibility, createCanvasGroup, createFrame, createObservableValue } from 'framekit';
import { inspectInstance } from 'framekit/devtools';
import { expect, it } from 'vitest';

import { setupAnimationClock } from '../support/animation-clock.js';
import { destroyNodesAfterEach } from '../support/node-cleanup.js';

const { advance } = setupAnimationClock();
const track = destroyNodesAfterEach();

it('releases owned animation resources after repeated fades and binding disposal', () => {
  const group = track(createCanvasGroup());
  group.onPropertyChanged('Visible', () => undefined)();
  const before = inspectInstance(group).cleanupRegistrations;
  const visible = createObservableValue(false);

  for (let binding = 0; binding < 3; binding += 1) {
    const release = bindVisibility(group, visible);

    for (let fade = 0; fade < 10; fade += 1) {
      visible.update((current) => !current);
      advance(200);
    }

    release();
    expect(inspectInstance(group).cleanupRegistrations).toBe(before);
  }
});

it('fades the complete subtree, reverses from the current value, and releases the hidden layout slot', () => {
  const group = track(createCanvasGroup());
  const child = createFrame({ BackgroundTransparency: 0.4 });
  child.Parent = group;
  const visible = createObservableValue(false);
  bindVisibility(group, visible, { duration: 1 });
  expect(group.Visible).toBe(false);
  expect(group.GroupTransparency).toBe(1);
  visible.set(true);
  expect(group.Visible).toBe(true);
  advance(500);
  expect(group.GroupTransparency).toBeCloseTo(0.25);
  visible.set(false);
  expect(group.GroupTransparency).toBeCloseTo(0.25);
  expect(group.unsafeElement.inert).toBe(true);
  expect(group.unsafeElement.getAttribute('aria-hidden')).toBe('true');
  expect(group.Visible).toBe(true);
  advance(1000);
  expect(group.Visible).toBe(false);
  expect(child.BackgroundTransparency).toBe(0.4);
});

it('restores caller state and ignores stale disposal after replacing a binding', () => {
  const group = track(createCanvasGroup({ GroupTransparency: 0.4 }));
  group.unsafeElement.setAttribute('aria-hidden', 'false');
  group.unsafeElement.inert = true;
  const visible = createObservableValue(false);
  const first = bindVisibility(group, visible);
  const release = bindVisibility(group, visible, { duration: 0 });
  first();
  expect(group.Visible).toBe(false);
  visible.set(true);
  expect(group.GroupTransparency).toBe(0);
  expect(group.unsafeElement.inert).toBe(true);
  release();
  expect(group.GroupTransparency).toBe(0.4);
  expect(group.Visible).toBe(true);
  expect(group.unsafeElement.getAttribute('aria-hidden')).toBe('false');
  visible.set(false);
  expect(group.Visible).toBe(true);
});

it('releases a running fade on destruction and rejects invalid options before disturbing a binding', () => {
  const group = track(createCanvasGroup());
  const visible = createObservableValue(false);
  bindVisibility(group, visible);
  expect(() => bindVisibility(group, visible, { duration: -1 })).toThrow(/duration/);
  expect(group.Visible).toBe(false);
  visible.set(true);
  advance(50);
  expect(() => group.destroy()).not.toThrow();
  expect(() => visible.set(false)).not.toThrow();
  advance(1000);
  expect(() => bindVisibility(group, visible)).toThrow(/destroyed/);
  expect(() => createCanvasGroup({ GroupTransparency: 2 })).toThrow(/GroupTransparency/);
});
