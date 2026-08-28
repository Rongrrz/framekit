import {
  claimAnimationProperties,
  releaseAnimationProperties,
  type AnimationOwner,
} from '../runtime/animation-ownership';
import { addCleanup, assertNodeActive, isDestroyed } from '../runtime/node-lifecycle';
import { applyPropertyPatch, getPropertiesSnapshot } from '../runtime/node-properties';
import type { Node, NodeProperties } from '../runtime/node-state';
import { createSignal, readonlySignal, type Signal } from '../runtime/signal';
import { assertNonNegativeFinite } from '../runtime/validation';
import {
  assertEasingDirection,
  assertEasingStyle,
  ease,
  type EasingDirection,
  type EasingStyle,
} from './easing';
import type { AnimationGoal } from './types';
import { interpolateAnimationValue } from './value';

export type { EasingDirection, EasingStyle } from './easing';

export type TweenInfo = Readonly<{
  Time: number;
  EasingStyle: EasingStyle;
  EasingDirection: EasingDirection;
  RepeatCount: number;
  Reverses: boolean;
  DelayTime: number;
}>;

export type TweenPlaybackState =
  | 'Idle'
  | 'Delayed'
  | 'Playing'
  | 'Paused'
  | 'Completed'
  | 'Cancelled';

export type TweenGoal<Properties extends NodeProperties> = AnimationGoal<Properties>;

export type Tween = {
  play(): void;
  pause(): void;
  cancel(): void;
  playbackState(): TweenPlaybackState;
  readonly completed: Signal<[TweenPlaybackState]>;
};

type AnimationFrame = ReturnType<typeof requestAnimationFrame>;

/** Creates immutable playback settings for a tween. Times are measured in seconds. */
export function tweenInfo(
  time: number,
  easingStyle: EasingStyle = 'Quad',
  easingDirection: EasingDirection = 'Out',
  repeatCount = 0,
  reverses = false,
  delayTime = 0,
): TweenInfo {
  assertNonNegativeFinite(time, 'Tween time');
  assertNonNegativeFinite(delayTime, 'Tween delay');
  if (!Number.isInteger(repeatCount) || repeatCount < -1) {
    throw new TypeError('Tween repeat count must be -1 or a non-negative integer.');
  }
  const info: TweenInfo = {
    Time: time,
    EasingStyle: easingStyle,
    EasingDirection: easingDirection,
    RepeatCount: repeatCount,
    Reverses: reverses,
    DelayTime: delayTime,
  };
  validateInfo(info);
  return Object.freeze(info);
}

/** Creates a controllable tween that applies interpolated property values. */
export function createTween<Properties extends NodeProperties>(
  node: Node<Properties>,
  info: TweenInfo,
  goal: TweenGoal<Properties>,
): Tween {
  assertNodeActive(node);
  validateInfo(info);

  const goalEntries = Object.entries(goal) as [keyof Properties, unknown][];
  if (goalEntries.length === 0) throw new TypeError('A tween needs at least one goal property.');
  const goalKeys = goalEntries.map(([key]) => key);
  const goalValuesByProperty = new Map(goalEntries);
  const initialProperties = getPropertiesSnapshot(node);
  for (const key of goalKeys) {
    if (!Object.hasOwn(initialProperties, key)) {
      throw new TypeError(`Unknown tween property "${String(key)}" on ${initialProperties.Name}.`);
    }
    assertTweenable(initialProperties[key], goalValuesByProperty.get(key), String(key));
  }

  const completedEmitter = createSignal<[TweenPlaybackState]>();
  const completed = readonlySignal(completedEmitter);
  let playbackState: TweenPlaybackState = 'Idle';
  let animationFrame: AnimationFrame | undefined;
  let startedAtMs = 0;
  let elapsedBeforePauseMs = 0;
  let startValues: Partial<Properties> = {};
  let ownedProperties: (keyof Properties)[] = [];
  let disposed = false;

  const animationOwner: AnimationOwner = {
    cancelPropertyFromConflict: () => finish('Cancelled'),
  };

  function play(): void {
    assertUsable();
    if (playbackState === 'Playing' || playbackState === 'Delayed') return;

    if (playbackState === 'Paused') {
      startedAtMs = now() - elapsedBeforePauseMs;
    } else {
      startValues = {};
      const latest = getPropertiesSnapshot(node);
      for (const key of goalKeys) startValues[key] = latest[key];
      elapsedBeforePauseMs = 0;
      startedAtMs = now();
    }

    claimGoalProperties();
    playbackState = elapsedBeforePauseMs < info.DelayTime * 1000 ? 'Delayed' : 'Playing';
    if (info.Time === 0 && info.DelayTime === 0) {
      applyProgressOrCancel(finalProgress());
      finish('Completed');
      return;
    }
    animationFrame = requestAnimationFrame(step);
  }

  function pause(): void {
    assertUsable();
    if (playbackState !== 'Playing' && playbackState !== 'Delayed') return;
    elapsedBeforePauseMs = Math.max(0, now() - startedAtMs);
    cancelFrame();
    playbackState = 'Paused';
  }

  function cancel(): void {
    assertUsable();
    if (
      playbackState === 'Idle' ||
      playbackState === 'Completed' ||
      playbackState === 'Cancelled'
    ) {
      return;
    }
    finish('Cancelled');
  }

  function step(timestamp: number): void {
    animationFrame = undefined;
    if (playbackState !== 'Playing' && playbackState !== 'Delayed') return;

    const elapsedMs = Math.max(0, timestamp - startedAtMs);
    elapsedBeforePauseMs = elapsedMs;
    const delayMs = info.DelayTime * 1000;
    if (elapsedMs < delayMs) {
      playbackState = 'Delayed';
      animationFrame = requestAnimationFrame(step);
      return;
    }

    playbackState = 'Playing';
    const durationMs = info.Time * 1000;
    const activeElapsedMs = elapsedMs - delayMs;
    if (durationMs === 0) {
      applyProgressOrCancel(finalProgress());
      finish('Completed');
      return;
    }
    const traversalIndex = Math.floor(activeElapsedMs / durationMs);
    const traversalsPerIteration = info.Reverses ? 2 : 1;
    const maximumTraversals =
      info.RepeatCount === -1
        ? Number.POSITIVE_INFINITY
        : (info.RepeatCount + 1) * traversalsPerIteration;
    if (traversalIndex >= maximumTraversals) {
      applyProgressOrCancel(finalProgress());
      finish('Completed');
      return;
    }

    const traversalProgress = (activeElapsedMs % durationMs) / durationMs;
    const isReverseTraversal = info.Reverses && traversalIndex % 2 === 1;
    applyProgressOrCancel(isReverseTraversal ? 1 - traversalProgress : traversalProgress);
    animationFrame = requestAnimationFrame(step);
  }

  function applyProgressOrCancel(progress: number): void {
    try {
      applyProgress(progress);
    } catch (error) {
      try {
        finish('Cancelled');
      } catch (completionError) {
        throw new AggregateError(
          [error, completionError],
          'A tween update and its cancellation listener both failed.',
        );
      }
      throw error;
    }
  }

  function applyProgress(progress: number): void {
    if (isDestroyed(node)) return;
    const eased = ease(progress, info.EasingStyle, info.EasingDirection);
    const patch: Partial<Properties> = {};
    for (const key of goalKeys) {
      patch[key] = interpolateAnimationValue(
        startValues[key],
        goalValuesByProperty.get(key),
        eased,
        String(key),
      ) as Properties[keyof Properties];
    }
    applyPropertyPatch(node, patch);
  }

  function finalProgress(): number {
    return info.Reverses ? 0 : 1;
  }

  function claimGoalProperties(): void {
    claimAnimationProperties(node, goalKeys, animationOwner);
    ownedProperties = [...goalKeys];
  }

  function releaseGoalProperties(): void {
    releaseAnimationProperties(node, ownedProperties, animationOwner);
    ownedProperties = [];
  }

  function finish(nextState: 'Completed' | 'Cancelled'): void {
    if (playbackState === 'Completed' || playbackState === 'Cancelled') return;
    cancelFrame();
    releaseGoalProperties();
    playbackState = nextState;
    completedEmitter.emit(nextState);
  }

  function cancelFrame(): void {
    if (animationFrame === undefined) return;
    cancelAnimationFrame(animationFrame);
    animationFrame = undefined;
  }

  function assertUsable(): void {
    if (disposed || isDestroyed(node))
      throw new Error(`${initialProperties.Name} has been destroyed.`);
  }

  addCleanup(node, () => {
    try {
      if (
        playbackState === 'Playing' ||
        playbackState === 'Delayed' ||
        playbackState === 'Paused'
      ) {
        finish('Cancelled');
      }
    } finally {
      cancelFrame();
      releaseGoalProperties();
      disposed = true;
      completedEmitter.clear();
    }
  });

  return Object.freeze({ play, pause, cancel, playbackState: () => playbackState, completed });
}

function assertTweenable(start: unknown, goal: unknown, property: string): void {
  try {
    interpolateAnimationValue(start, goal, 0, property);
  } catch {
    throw new TypeError(`Property "${property}" does not contain compatible tweenable values.`);
  }
}

function now(): number {
  return performance.now();
}

function validateInfo(info: TweenInfo): void {
  assertNonNegativeFinite(info.Time, 'Tween time');
  assertNonNegativeFinite(info.DelayTime, 'Tween delay');
  if (!Number.isInteger(info.RepeatCount) || info.RepeatCount < -1) {
    throw new TypeError('Tween repeat count must be -1 or a non-negative integer.');
  }
  assertEasingStyle(info.EasingStyle);
  assertEasingDirection(info.EasingDirection);
  if (typeof info.Reverses !== 'boolean') throw new TypeError('Tween reverses must be a boolean.');
}
