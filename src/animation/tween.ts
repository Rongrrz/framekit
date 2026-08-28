import {
  claimAnimationProperties,
  releaseAnimationProperties,
  type AnimationOwner,
} from '../shared/runtime/animation-ownership';
import type { Node, NodeProperties } from '../shared/runtime/node';
import { addCleanup, assertNodeActive, isDestroyed } from '../shared/runtime/node-lifecycle';
import { applyPropertyPatch, getPropertiesSnapshot } from '../shared/runtime/node-properties';
import { createSignal, readonlySignal, type Signal } from '../shared/runtime/signal';
import { assertNonNegativeFinite } from '../shared/runtime/validation';
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

/** Timing and playback settings for a tween. */
export type TweenOptions = Readonly<{
  /** Duration of one traversal in seconds. */
  Duration: number;
  /** Curve used to transform progress. */
  EasingStyle?: EasingStyle;
  /** Portion of the easing curve to apply. */
  EasingDirection?: EasingDirection;
  /** Additional playthroughs, or -1 to repeat forever. */
  RepeatCount?: number;
  /** Whether each playthrough returns to its starting values. */
  Reverses?: boolean;
  /** Delay before playback begins, in seconds. */
  Delay?: number;
}>;

type ResolvedTweenOptions = Required<TweenOptions>;

/** Current lifecycle state of a tween. */
export type TweenPlaybackState =
  | 'Idle'
  | 'Delayed'
  | 'Playing'
  | 'Paused'
  | 'Completed'
  | 'Cancelled';

/** Animatable property targets for a tween. */
export type TweenGoal<Properties extends NodeProperties> = AnimationGoal<Properties>;

/** Explicit playback controls for a tween. */
export type Tween = {
  /** Starts, resumes, or restarts playback from current property values. */
  play(): void;
  /** Pauses playback while retaining property ownership. */
  pause(): void;
  /** Stops playback and emits the Cancelled state. */
  cancel(): void;
  /** Returns the current playback state. */
  playbackState(): TweenPlaybackState;
  /** Emits when playback completes or is cancelled. */
  readonly completed: Signal<[TweenPlaybackState]>;
};

type AnimationFrame = ReturnType<typeof requestAnimationFrame>;

/** Creates a controllable tween that applies interpolated property values. */
export function createTween<Properties extends NodeProperties>(
  node: Node<Properties>,
  options: TweenOptions,
  goal: TweenGoal<Properties>,
): Tween {
  assertNodeActive(node);
  const resolvedOptions = resolveOptions(options);

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
    playbackState = elapsedBeforePauseMs < resolvedOptions.Delay * 1000 ? 'Delayed' : 'Playing';
    if (resolvedOptions.Duration === 0 && resolvedOptions.Delay === 0) {
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
    const delayMs = resolvedOptions.Delay * 1000;
    if (elapsedMs < delayMs) {
      playbackState = 'Delayed';
      animationFrame = requestAnimationFrame(step);
      return;
    }

    playbackState = 'Playing';
    const durationMs = resolvedOptions.Duration * 1000;
    const activeElapsedMs = elapsedMs - delayMs;
    if (durationMs === 0) {
      applyProgressOrCancel(finalProgress());
      finish('Completed');
      return;
    }
    const traversalIndex = Math.floor(activeElapsedMs / durationMs);
    const traversalsPerIteration = resolvedOptions.Reverses ? 2 : 1;
    const maximumTraversals =
      resolvedOptions.RepeatCount === -1
        ? Number.POSITIVE_INFINITY
        : (resolvedOptions.RepeatCount + 1) * traversalsPerIteration;
    if (traversalIndex >= maximumTraversals) {
      applyProgressOrCancel(finalProgress());
      finish('Completed');
      return;
    }

    const traversalProgress = (activeElapsedMs % durationMs) / durationMs;
    const isReverseTraversal = resolvedOptions.Reverses && traversalIndex % 2 === 1;
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
    const eased = ease(progress, resolvedOptions.EasingStyle, resolvedOptions.EasingDirection);
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
    return resolvedOptions.Reverses ? 0 : 1;
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

function resolveOptions(options: TweenOptions): ResolvedTweenOptions {
  const resolved: ResolvedTweenOptions = {
    Duration: options.Duration,
    EasingStyle: options.EasingStyle ?? 'Quad',
    EasingDirection: options.EasingDirection ?? 'Out',
    RepeatCount: options.RepeatCount ?? 0,
    Reverses: options.Reverses ?? false,
    Delay: options.Delay ?? 0,
  };

  assertNonNegativeFinite(resolved.Duration, 'Tween duration');
  assertNonNegativeFinite(resolved.Delay, 'Tween delay');
  if (!Number.isInteger(resolved.RepeatCount) || resolved.RepeatCount < -1) {
    throw new TypeError('Tween repeat count must be -1 or a non-negative integer.');
  }
  assertEasingStyle(resolved.EasingStyle);
  assertEasingDirection(resolved.EasingDirection);
  if (typeof resolved.Reverses !== 'boolean') {
    throw new TypeError('Tween reverses must be a boolean.');
  }
  return resolved;
}
