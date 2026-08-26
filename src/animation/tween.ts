import { addCleanup, assertNodeActive, isDestroyed, props, update } from '../runtime/node';
import { createSignal, type Signal } from '../runtime/signal';
import type { Node, NodeProps } from '../runtime/state';
import {
  claimAnimationProperties,
  releaseAnimationProperties,
  type AnimationOwner,
} from './ownership';
import type { AnimationGoal } from './types';
import { interpolateAnimationValue } from './value';

export type EasingStyle =
  | 'Linear'
  | 'Sine'
  | 'Quad'
  | 'Cubic'
  | 'Quart'
  | 'Quint'
  | 'Exponential'
  | 'Circular'
  | 'Back'
  | 'Bounce'
  | 'Elastic';

export type EasingDirection = 'In' | 'Out' | 'InOut';

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

export type TweenGoal<Props extends NodeProps> = AnimationGoal<Props>;

export type Tween = {
  play(): void;
  pause(): void;
  cancel(): void;
  playbackState(): TweenPlaybackState;
  readonly completed: Signal<[TweenPlaybackState]>;
};

type AnimationFrame = ReturnType<typeof requestAnimationFrame>;
const easingStyles: readonly EasingStyle[] = [
  'Linear',
  'Sine',
  'Quad',
  'Cubic',
  'Quart',
  'Quint',
  'Exponential',
  'Circular',
  'Back',
  'Bounce',
  'Elastic',
];
const easingDirections: readonly EasingDirection[] = ['In', 'Out', 'InOut'];

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

/** Creates a controllable tween that applies interpolated values through update(). */
export function createTween<Props extends NodeProps>(
  node: Node<Props>,
  info: TweenInfo,
  goal: TweenGoal<Props>,
): Tween {
  assertNodeActive(node);
  validateInfo(info);

  const goalKeys = Object.keys(goal) as (keyof Props)[];
  const goals = goal as unknown as Partial<Props>;
  if (goalKeys.length === 0) throw new TypeError('A tween needs at least one goal property.');
  const currentProps = props(node);
  for (const key of goalKeys) {
    if (!Object.hasOwn(currentProps, key)) {
      throw new TypeError(`Unknown tween property "${String(key)}" on ${currentProps.Name}.`);
    }
    assertTweenable(currentProps[key], goals[key], String(key));
  }

  const completed = createSignal<[TweenPlaybackState]>();
  let state: TweenPlaybackState = 'Idle';
  let frame: AnimationFrame | undefined;
  let startedAt = 0;
  let elapsedBeforePause = 0;
  let startValues: Partial<Props> = {};
  let ownedKeys: (keyof Props)[] = [];
  let disposed = false;

  const controller: AnimationOwner = { cancelPropertyFromConflict: () => finish('Cancelled') };

  function play(): void {
    assertUsable();
    if (state === 'Playing' || state === 'Delayed') return;

    if (state === 'Paused') {
      startedAt = now() - elapsedBeforePause;
    } else {
      startValues = {};
      const latest = props(node);
      for (const key of goalKeys) startValues[key] = latest[key];
      elapsedBeforePause = 0;
      startedAt = now();
    }

    claimProperties();
    state = elapsedBeforePause < info.DelayTime * 1000 ? 'Delayed' : 'Playing';
    if (info.Time === 0 && info.DelayTime === 0) {
      applyProgress(finalProgress());
      finish('Completed');
      return;
    }
    frame = requestAnimationFrame(step);
  }

  function pause(): void {
    assertUsable();
    if (state !== 'Playing' && state !== 'Delayed') return;
    elapsedBeforePause = Math.max(0, now() - startedAt);
    cancelFrame();
    releaseProperties();
    state = 'Paused';
  }

  function cancel(): void {
    assertUsable();
    if (state === 'Idle' || state === 'Completed' || state === 'Cancelled') return;
    finish('Cancelled');
  }

  function step(timestamp: number): void {
    frame = undefined;
    if (state !== 'Playing' && state !== 'Delayed') return;

    const elapsed = Math.max(0, timestamp - startedAt);
    elapsedBeforePause = elapsed;
    const delay = info.DelayTime * 1000;
    if (elapsed < delay) {
      state = 'Delayed';
      frame = requestAnimationFrame(step);
      return;
    }

    state = 'Playing';
    const duration = info.Time * 1000;
    const activeElapsed = elapsed - delay;
    if (duration === 0) {
      applyProgress(finalProgress());
      finish('Completed');
      return;
    }
    const cycle = Math.floor(activeElapsed / duration);
    const traversalsPerCycle = info.Reverses ? 2 : 1;
    const maximumCycles =
      info.RepeatCount === -1
        ? Number.POSITIVE_INFINITY
        : (info.RepeatCount + 1) * traversalsPerCycle;
    if (cycle >= maximumCycles) {
      applyProgress(finalProgress());
      finish('Completed');
      return;
    }

    const cycleProgress = (activeElapsed % duration) / duration;
    const reversed = info.Reverses && cycle % 2 === 1;
    applyProgress(reversed ? 1 - cycleProgress : cycleProgress);
    frame = requestAnimationFrame(step);
  }

  function applyProgress(progress: number): void {
    if (isDestroyed(node)) return;
    const eased = ease(progress, info.EasingStyle, info.EasingDirection);
    const patch: Partial<Props> = {};
    for (const key of goalKeys) {
      patch[key] = interpolateAnimationValue(
        startValues[key],
        goals[key],
        eased,
        String(key),
      ) as Props[keyof Props];
    }
    update(node, patch);
  }

  function finalProgress(): number {
    return info.Reverses ? 0 : 1;
  }

  function claimProperties(): void {
    claimAnimationProperties(node, goalKeys, controller);
    ownedKeys = [...goalKeys];
  }

  function releaseProperties(): void {
    releaseAnimationProperties(node, ownedKeys, controller);
    ownedKeys = [];
  }

  function finish(nextState: 'Completed' | 'Cancelled'): void {
    if (state === 'Completed' || state === 'Cancelled') return;
    cancelFrame();
    releaseProperties();
    state = nextState;
    completed.emit(nextState);
  }

  function cancelFrame(): void {
    if (frame === undefined) return;
    cancelAnimationFrame(frame);
    frame = undefined;
  }

  function assertUsable(): void {
    if (disposed || isDestroyed(node)) throw new Error(`${currentProps.Name} has been destroyed.`);
  }

  addCleanup(node, () => {
    if (state === 'Playing' || state === 'Delayed' || state === 'Paused') finish('Cancelled');
    cancelFrame();
    releaseProperties();
    disposed = true;
    completed.clear();
  });

  return Object.freeze({ play, pause, cancel, playbackState: () => state, completed });
}

function assertTweenable(start: unknown, goal: unknown, property: string): void {
  try {
    interpolateAnimationValue(start, goal, 0, property);
  } catch {
    throw new TypeError(`Property "${property}" does not contain compatible tweenable values.`);
  }
}

function ease(alpha: number, style: EasingStyle, direction: EasingDirection): number {
  const clamped = Math.min(1, Math.max(0, alpha));
  if (direction === 'In') return easeIn(clamped, style);
  if (direction === 'Out') return 1 - easeIn(1 - clamped, style);
  return clamped < 0.5 ? easeIn(clamped * 2, style) / 2 : 1 - easeIn((1 - clamped) * 2, style) / 2;
}

function easeIn(alpha: number, style: EasingStyle): number {
  switch (style) {
    case 'Linear':
      return alpha;
    case 'Sine':
      return 1 - Math.cos((alpha * Math.PI) / 2);
    case 'Quad':
      return alpha ** 2;
    case 'Cubic':
      return alpha ** 3;
    case 'Quart':
      return alpha ** 4;
    case 'Quint':
      return alpha ** 5;
    case 'Exponential':
      return alpha === 0 ? 0 : 2 ** (10 * alpha - 10);
    case 'Circular':
      return 1 - Math.sqrt(1 - alpha ** 2);
    case 'Back': {
      const overshoot = 1.70158;
      return (overshoot + 1) * alpha ** 3 - overshoot * alpha ** 2;
    }
    case 'Bounce':
      return 1 - bounceOut(1 - alpha);
    case 'Elastic':
      if (alpha === 0 || alpha === 1) return alpha;
      return -(2 ** (10 * alpha - 10)) * Math.sin(((alpha * 10 - 10.75) * 2 * Math.PI) / 3);
  }
}

function bounceOut(alpha: number): number {
  const scale = 7.5625;
  const divisor = 2.75;
  if (alpha < 1 / divisor) return scale * alpha ** 2;
  if (alpha < 2 / divisor) return scale * (alpha - 1.5 / divisor) ** 2 + 0.75;
  if (alpha < 2.5 / divisor) return scale * (alpha - 2.25 / divisor) ** 2 + 0.9375;
  return scale * (alpha - 2.625 / divisor) ** 2 + 0.984375;
}

function now(): number {
  return performance.now();
}

function assertNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative finite number.`);
  }
}

function validateInfo(info: TweenInfo): void {
  assertNonNegativeFinite(info.Time, 'Tween time');
  assertNonNegativeFinite(info.DelayTime, 'Tween delay');
  if (!Number.isInteger(info.RepeatCount) || info.RepeatCount < -1) {
    throw new TypeError('Tween repeat count must be -1 or a non-negative integer.');
  }
  if (!easingStyles.includes(info.EasingStyle)) throw new TypeError('Unknown tween easing style.');
  if (!easingDirections.includes(info.EasingDirection)) {
    throw new TypeError('Unknown tween easing direction.');
  }
  if (typeof info.Reverses !== 'boolean') throw new TypeError('Tween reverses must be a boolean.');
}
