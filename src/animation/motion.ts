import { addCleanup, assertNodeActive, isDestroyed, props, update } from '../runtime/node';
import { createSignal, type Signal } from '../runtime/signal';
import type { Node, NodeProps } from '../runtime/state';
import { color3, type Color3 } from '../values/color3';
import { udim, udim2, type UDim, type UDim2 } from '../values/udim';
import { vector2, type Vector2 } from '../values/vector2';
import {
  claimAnimationProperties,
  releaseAnimationProperties,
  type AnimationOwner,
} from './ownership';
import type { AnimationGoal } from './types';

export type SpringOptions = Readonly<{
  /** Pull toward the goal. Higher values feel faster and firmer. */
  tension?: number;
  /** Resistance to motion. Lower values allow more overshoot. */
  friction?: number;
  /** Component distance and speed at which the spring snaps exactly to its goal. */
  precision?: number;
}>;

export type Motion<Props extends NodeProps = NodeProps> = {
  /** Retargets properties without discarding their current velocity. */
  spring(goal: AnimationGoal<Props>): void;
  /** Stops one property, or every property when omitted, at its current value. */
  stop(property?: keyof AnimationGoal<Props>): void;
  isAnimating(): boolean;
  readonly completed: Signal<[]>;
};

type ResolvedSpringOptions = Required<SpringOptions>;
type SpringKind = 'number' | 'Color3' | 'Vector2' | 'UDim' | 'UDim2';
type PropertySpring = {
  kind: SpringKind;
  current: number[];
  goal: number[];
  velocity: number[];
};
type AnimationFrame = ReturnType<typeof requestAnimationFrame>;

const defaultOptions: ResolvedSpringOptions = {
  tension: 170,
  friction: 26,
  precision: 0.001,
};

/** Creates a retained motion controller whose spring can be freely retargeted. */
export function createMotion<Props extends NodeProps>(
  node: Node<Props>,
  options: SpringOptions = {},
): Motion<Props> {
  assertNodeActive(node);
  const config = resolveOptions(options);
  const springs = new Map<keyof Props, PropertySpring>();
  const completed = createSignal<[]>();
  let frame: AnimationFrame | undefined;
  let previousTimestamp = 0;
  let disposed = false;

  const owner: AnimationOwner = {
    cancelPropertyFromConflict: (property) => stopProperty(property as keyof Props),
  };

  function spring(goal: AnimationGoal<Props>): void {
    assertUsable();
    const goals = goal as unknown as Partial<Props>;
    const keys = Object.keys(goal) as (keyof Props)[];
    if (keys.length === 0) throw new TypeError('A spring needs at least one goal property.');

    const currentProps = props(node);
    const prepared = new Map<keyof Props, { kind: SpringKind; goal: number[]; start?: number[] }>();
    for (const key of keys) {
      if (!Object.hasOwn(currentProps, key)) {
        throw new TypeError(`Unknown spring property "${String(key)}" on ${currentProps.Name}.`);
      }
      const target = decompose(goals[key], String(key));
      const existing = springs.get(key);
      if (existing) {
        assertMatchingKind(existing.kind, target.kind, String(key));
        prepared.set(key, { kind: target.kind, goal: target.numbers });
      } else {
        const start = decompose(currentProps[key], String(key));
        assertMatchingKind(start.kind, target.kind, String(key));
        prepared.set(key, { kind: target.kind, goal: target.numbers, start: start.numbers });
      }
    }

    claimAnimationProperties(node, keys, owner);
    for (const [key, value] of prepared) {
      const existing = springs.get(key);
      if (existing) {
        existing.goal = value.goal;
      } else {
        const current = value.start!;
        springs.set(key, {
          kind: value.kind,
          current,
          goal: value.goal,
          velocity: current.map(() => 0),
        });
      }
    }
    schedule();
  }

  function stop(property?: keyof AnimationGoal<Props>): void {
    assertUsable();
    if (property !== undefined) {
      stopProperty(property as keyof Props);
      return;
    }
    const keys = Array.from(springs.keys());
    springs.clear();
    releaseAnimationProperties(node, keys, owner);
    cancelFrame();
  }

  function stopProperty(property: keyof Props): void {
    if (!springs.delete(property)) return;
    releaseAnimationProperties(node, [property], owner);
    if (springs.size === 0) cancelFrame();
  }

  function schedule(): void {
    if (frame !== undefined) return;
    previousTimestamp = performance.now();
    frame = requestAnimationFrame(step);
  }

  function step(timestamp: number): void {
    frame = undefined;
    if (springs.size === 0 || isDestroyed(node)) return;
    const deltaTime = Math.max(0, (timestamp - previousTimestamp) / 1000);
    previousTimestamp = timestamp;
    const patch: Partial<Props> = {};
    const settled: (keyof Props)[] = [];

    for (const [key, propertySpring] of springs) {
      let propertySettled = true;
      for (let index = 0; index < propertySpring.current.length; index += 1) {
        const result = solveSpring(
          propertySpring.current[index]!,
          propertySpring.velocity[index]!,
          propertySpring.goal[index]!,
          deltaTime,
          config,
        );
        propertySpring.current[index] = result.value;
        propertySpring.velocity[index] = result.velocity;
        if (
          Math.abs(result.value - propertySpring.goal[index]!) > config.precision ||
          Math.abs(result.velocity) > config.precision
        ) {
          propertySettled = false;
        }
      }

      if (propertySettled) {
        propertySpring.current = [...propertySpring.goal];
        propertySpring.velocity.fill(0);
        settled.push(key);
      }
      patch[key] = compose(propertySpring.kind, propertySpring.current) as Props[keyof Props];
    }

    update(node, patch);
    for (const key of settled) springs.delete(key);
    releaseAnimationProperties(node, settled, owner);
    if (springs.size === 0) completed.emit();
    else frame = requestAnimationFrame(step);
  }

  function cancelFrame(): void {
    if (frame === undefined) return;
    cancelAnimationFrame(frame);
    frame = undefined;
  }

  function assertUsable(): void {
    if (disposed || isDestroyed(node)) throw new Error(`${propsName(node)} has been destroyed.`);
  }

  addCleanup(node, () => {
    cancelFrame();
    releaseAnimationProperties(node, Array.from(springs.keys()), owner);
    springs.clear();
    disposed = true;
    completed.clear();
  });

  return Object.freeze({ spring, stop, isAnimating: () => springs.size > 0, completed });
}

function solveSpring(
  value: number,
  velocity: number,
  goal: number,
  deltaTime: number,
  options: ResolvedSpringOptions,
): { value: number; velocity: number } {
  if (deltaTime === 0) return { value, velocity };
  const displacement = value - goal;
  const angularFrequency = Math.sqrt(options.tension);
  const dampingRatio = options.friction / (2 * angularFrequency);

  if (dampingRatio < 1 - 1e-4) {
    const dampedFrequency = angularFrequency * Math.sqrt(1 - dampingRatio ** 2);
    const decay = Math.exp(-dampingRatio * angularFrequency * deltaTime);
    const cosine = Math.cos(dampedFrequency * deltaTime);
    const sine = Math.sin(dampedFrequency * deltaTime);
    const sineCoefficient =
      (velocity + dampingRatio * angularFrequency * displacement) / dampedFrequency;
    const nextDisplacement = decay * (displacement * cosine + sineCoefficient * sine);
    const nextVelocity =
      decay *
      (-dampingRatio * angularFrequency * (displacement * cosine + sineCoefficient * sine) +
        -displacement * dampedFrequency * sine +
        sineCoefficient * dampedFrequency * cosine);
    return { value: goal + nextDisplacement, velocity: nextVelocity };
  }

  if (dampingRatio > 1 + 1e-4) {
    const root = Math.sqrt(dampingRatio ** 2 - 1);
    const firstRate = -angularFrequency * (dampingRatio - root);
    const secondRate = -angularFrequency * (dampingRatio + root);
    const firstCoefficient = (velocity - secondRate * displacement) / (firstRate - secondRate);
    const secondCoefficient = displacement - firstCoefficient;
    const firstDecay = Math.exp(firstRate * deltaTime);
    const secondDecay = Math.exp(secondRate * deltaTime);
    return {
      value: goal + firstCoefficient * firstDecay + secondCoefficient * secondDecay,
      velocity:
        firstRate * firstCoefficient * firstDecay + secondRate * secondCoefficient * secondDecay,
    };
  }

  const decay = Math.exp(-angularFrequency * deltaTime);
  const coefficient = velocity + angularFrequency * displacement;
  return {
    value: goal + decay * (displacement + coefficient * deltaTime),
    velocity: decay * (velocity - angularFrequency * coefficient * deltaTime),
  };
}

function decompose(value: unknown, property: string): { kind: SpringKind; numbers: number[] } {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { kind: 'number', numbers: [value] };
  }
  if (isColor3(value)) return { kind: 'Color3', numbers: [value.R, value.G, value.B] };
  if (isUDim2(value)) {
    return {
      kind: 'UDim2',
      numbers: [value.X.Scale, value.X.Offset, value.Y.Scale, value.Y.Offset],
    };
  }
  if (isUDim(value)) return { kind: 'UDim', numbers: [value.Scale, value.Offset] };
  if (isVector2(value)) return { kind: 'Vector2', numbers: [value.X, value.Y] };
  throw new TypeError(`Property "${property}" does not contain a springable value.`);
}

function compose(
  kind: SpringKind,
  numbers: readonly number[],
): number | Color3 | Vector2 | UDim | UDim2 {
  switch (kind) {
    case 'number':
      return numbers[0]!;
    case 'Color3':
      return color3(numbers[0]!, numbers[1]!, numbers[2]!);
    case 'Vector2':
      return vector2(numbers[0]!, numbers[1]!);
    case 'UDim':
      return udim(numbers[0]!, numbers[1]!);
    case 'UDim2':
      return udim2(numbers[0]!, numbers[1]!, numbers[2]!, numbers[3]!);
  }
}

function assertMatchingKind(start: SpringKind, goal: SpringKind, property: string): void {
  if (start !== goal) {
    throw new TypeError(`Property "${property}" does not contain compatible springable values.`);
  }
}

function isColor3(value: unknown): value is Color3 {
  return hasOnlyNumericKeys(value, ['R', 'G', 'B']);
}

function isVector2(value: unknown): value is Vector2 {
  return hasOnlyNumericKeys(value, ['X', 'Y']);
}

function isUDim(value: unknown): value is UDim {
  return hasOnlyNumericKeys(value, ['Scale', 'Offset']);
}

function isUDim2(value: unknown): value is UDim2 {
  if (!isRecord(value) || Object.keys(value).length !== 2) return false;
  return isUDim(value.X) && isUDim(value.Y);
}

function hasOnlyNumericKeys(value: unknown, keys: readonly string[]): boolean {
  if (!isRecord(value) || Object.keys(value).length !== keys.length) return false;
  return keys.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function resolveOptions(options: SpringOptions): ResolvedSpringOptions {
  const resolved = { ...defaultOptions, ...options };
  assertPositiveFinite(resolved.tension, 'Spring tension');
  assertPositiveFinite(resolved.friction, 'Spring friction');
  assertPositiveFinite(resolved.precision, 'Spring precision');
  return resolved;
}

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive finite number.`);
  }
}

function propsName(node: Node): string {
  if (isDestroyed(node)) return 'Node';
  return props(node).Name;
}
