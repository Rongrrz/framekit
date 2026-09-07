import type { Instance, InstanceProperties } from '../runtime/node';
import { onDestroy, isDestroyed } from '../runtime/node-lifecycle';
import { getPropertiesSnapshot } from '../runtime/node-properties';
import { getActiveNodeState } from '../runtime/node-state';
import { createSignal, readonlySignal, type Signal } from '../runtime/signal';
import { assertNonNegativeFinite } from '../runtime/validation';
import {
  assertEasingDirection,
  assertEasingStyle,
  ease,
  type EasingDirection,
  type EasingStyle,
} from './easing';
import { prepareAnimationGoal } from './goal';
import {
  applyAnimationProperties,
  claimAnimationProperties,
  releaseAnimationProperties,
  type AnimationOwner,
} from './ownership';
import { cancelAnimationTask, scheduleAnimationTask } from './scheduler';
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
export type TweenGoal<Properties extends InstanceProperties> = AnimationGoal<Properties>;

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

/** Creates a controllable tween that applies interpolated property values. */
export function createTween<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  options: TweenOptions,
  goal: TweenGoal<Properties>,
): Tween {
  getActiveNodeState(node);
  const resolvedOptions = resolveTweenOptions(options);

  const preparedGoal = prepareAnimationGoal(node, goal, 'tween');
  const goalKeys = preparedGoal.map(({ property }) => property);
  const initialName = getPropertiesSnapshot(node).Name;
  const durationMs = resolvedOptions.Duration * 1000;
  const delayMs = resolvedOptions.Delay * 1000;
  const finalProgress = resolvedOptions.Reverses ? 0 : 1;
  const traversalsPerIteration = resolvedOptions.Reverses ? 2 : 1;
  const maximumTraversals =
    resolvedOptions.RepeatCount === -1
      ? Number.POSITIVE_INFINITY
      : (resolvedOptions.RepeatCount + 1) * traversalsPerIteration;

  const completedEmitter = createSignal<[TweenPlaybackState]>();
  const completed = readonlySignal(completedEmitter);
  let playbackState: TweenPlaybackState = 'Idle';
  let startedAtMs = 0;
  let elapsedBeforePauseMs = 0;
  let startValues: Partial<Properties> = {};
  const animationPatch: Partial<Properties> = {};

  const animationOwner: AnimationOwner = {
    cancelPropertyFromConflict: () => finish('Cancelled'),
  };

  function play(): void {
    assertUsable();
    if (playbackState === 'Playing' || playbackState === 'Delayed') return;

    if (playbackState === 'Paused') {
      startedAtMs = performance.now() - elapsedBeforePauseMs;
    } else {
      startValues = {};
      const latest = getPropertiesSnapshot(node);
      for (const property of goalKeys) startValues[property] = latest[property];
      elapsedBeforePauseMs = 0;
      startedAtMs = performance.now();
    }

    claimAnimationProperties(node, goalKeys, animationOwner);
    playbackState = elapsedBeforePauseMs < delayMs ? 'Delayed' : 'Playing';
    if (durationMs === 0 && delayMs === 0) {
      complete();
      return;
    }
    scheduleAnimationTask(step);
  }

  function pause(): void {
    assertUsable();
    if (playbackState !== 'Playing' && playbackState !== 'Delayed') return;
    elapsedBeforePauseMs = Math.max(0, performance.now() - startedAtMs);
    cancelAnimationTask(step);
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
    if (playbackState !== 'Playing' && playbackState !== 'Delayed') return;

    const elapsedMs = Math.max(0, timestamp - startedAtMs);
    elapsedBeforePauseMs = elapsedMs;
    if (elapsedMs < delayMs) {
      playbackState = 'Delayed';
      return;
    }

    playbackState = 'Playing';
    const activeElapsedMs = elapsedMs - delayMs;
    if (durationMs === 0) {
      complete();
      return;
    }
    const traversalIndex = Math.floor(activeElapsedMs / durationMs);
    if (traversalIndex >= maximumTraversals) {
      complete();
      return;
    }

    const traversalProgress = (activeElapsedMs % durationMs) / durationMs;
    const isReverseTraversal = resolvedOptions.Reverses && traversalIndex % 2 === 1;
    applyProgressOrCancel(isReverseTraversal ? 1 - traversalProgress : traversalProgress);
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
    const easedProgress = ease(
      progress,
      resolvedOptions.EasingStyle,
      resolvedOptions.EasingDirection,
    );
    for (const { property, goalValue } of preparedGoal) {
      animationPatch[property] = interpolateAnimationValue(
        startValues[property],
        goalValue,
        easedProgress,
        String(property),
      ) as Properties[keyof Properties];
    }
    applyAnimationProperties(node, animationPatch, animationOwner);
  }

  function complete(): void {
    applyProgressOrCancel(finalProgress);
    finish('Completed');
  }

  function finish(nextState: 'Completed' | 'Cancelled'): void {
    if (playbackState === 'Completed' || playbackState === 'Cancelled') return;
    cancelAnimationTask(step);
    releaseAnimationProperties(node, goalKeys, animationOwner);
    playbackState = nextState;
    completedEmitter.emit(nextState);
  }

  function assertUsable(): void {
    if (isDestroyed(node)) throw new Error(`${initialName} has been destroyed.`);
  }

  onDestroy(node, () => {
    try {
      if (
        playbackState === 'Playing' ||
        playbackState === 'Delayed' ||
        playbackState === 'Paused'
      ) {
        finish('Cancelled');
      }
    } finally {
      cancelAnimationTask(step);
      releaseAnimationProperties(node, goalKeys, animationOwner);
      completedEmitter.clear();
    }
  });

  return Object.freeze({ play, pause, cancel, playbackState: () => playbackState, completed });
}

function resolveTweenOptions(options: TweenOptions): ResolvedTweenOptions {
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
