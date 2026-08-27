import { addCleanup, assertNodeActive, isDestroyed, props, update } from '../runtime/node';
import { createSignal, type Signal } from '../runtime/signal';
import type { Node, NodeProps } from '../runtime/state';
import {
  claimAnimationProperties,
  releaseAnimationProperties,
  type AnimationOwner,
} from './ownership';
import type { AnimationGoal } from './types';
import {
  assertCompatibleAnimationValues,
  composeAnimationValue,
  decomposeAnimationValue,
  type AnimationValueKind,
} from './value';

export type SpringOptions = Readonly<{
  /** Pull toward the goal. Higher values feel faster and firmer. */
  tension?: number;
  /** Resistance to motion. Lower values allow more overshoot. */
  friction?: number;
  /** Inertia of the animated value. Higher values respond more slowly. */
  mass?: number;
  /** Component distance and speed at which the spring snaps exactly to its goal. */
  precision?: number;
  /** Component speed below which the spring can be considered at rest. */
  restVelocity?: number;
}>;

export type Motion<Props extends NodeProps = NodeProps> = {
  /** Retargets properties without discarding their current velocity. */
  spring(goal: AnimationGoal<Props>): void;
  /** Retargets properties using settings for only the properties in this goal. */
  spring(goal: AnimationGoal<Props>, settings: SpringOptions): void;
  /** Stops one property, or every property when omitted, at its current value. */
  stop(property?: keyof AnimationGoal<Props>): void;
  isAnimating(): boolean;
  readonly completed: Signal<[]>;
};

type ResolvedSpringOptions = Required<SpringOptions>;
type PropertySpring = {
  kind: AnimationValueKind;
  current: number[];
  goal: number[];
  velocity: number[];
  config: ResolvedSpringOptions;
};
type AnimationFrame = ReturnType<typeof requestAnimationFrame>;

const defaultOptions: ResolvedSpringOptions = {
  tension: 170,
  friction: 26,
  mass: 1,
  precision: 0.001,
  restVelocity: 0.0625,
};

/** Creates a retained motion controller whose spring can be freely retargeted. */
export function createMotion<Props extends NodeProps>(
  node: Node<Props>,
  options: SpringOptions = {},
): Motion<Props> {
  assertNodeActive(node);
  const defaultConfig = resolveOptions(options, defaultOptions);
  const springs = new Map<keyof Props, PropertySpring>();
  const completed = createSignal<[]>();
  let frame: AnimationFrame | undefined;
  let previousTimestamp = 0;
  let disposed = false;

  const owner: AnimationOwner = {
    cancelPropertyFromConflict: (property) => stopProperty(property as keyof Props),
  };

  function spring(goal: AnimationGoal<Props>): void;
  function spring(goal: AnimationGoal<Props>, settings: SpringOptions): void;
  function spring(goal: AnimationGoal<Props>, settings?: SpringOptions): void {
    assertUsable();
    const config = settings ? resolveOptions(settings, defaultConfig) : defaultConfig;
    const goals = goal as unknown as Partial<Props>;
    const keys = Object.keys(goal) as (keyof Props)[];
    if (keys.length === 0) throw new TypeError('A spring needs at least one goal property.');

    const currentProps = props(node);
    const prepared = new Map<
      keyof Props,
      { kind: AnimationValueKind; goal: number[]; start?: number[] }
    >();
    for (const key of keys) {
      if (!Object.hasOwn(currentProps, key)) {
        throw new TypeError(`Unknown spring property "${String(key)}" on ${currentProps.Name}.`);
      }
      const target = decomposeAnimationValue(goals[key], String(key));
      const existing = springs.get(key);
      if (existing) {
        assertCompatibleAnimationValues(
          { kind: existing.kind, numbers: existing.current },
          target,
          String(key),
        );
        prepared.set(key, { kind: target.kind, goal: target.numbers });
      } else {
        const start = decomposeAnimationValue(currentProps[key], String(key));
        assertCompatibleAnimationValues(start, target, String(key));
        prepared.set(key, { kind: target.kind, goal: target.numbers, start: start.numbers });
      }
    }

    claimAnimationProperties(node, keys, owner);
    for (const [key, value] of prepared) {
      const existing = springs.get(key);
      if (existing) {
        existing.goal = value.goal;
        existing.config = config;
      } else {
        const current = value.start!;
        springs.set(key, {
          kind: value.kind,
          current,
          goal: value.goal,
          velocity: current.map(() => 0),
          config,
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
          propertySpring.config,
        );
        propertySpring.current[index] = result.value;
        propertySpring.velocity[index] = result.velocity;
        if (
          Math.abs(result.value - propertySpring.goal[index]!) > propertySpring.config.precision ||
          Math.abs(result.velocity) > propertySpring.config.restVelocity
        ) {
          propertySettled = false;
        }
      }

      if (propertySettled) {
        propertySpring.current = [...propertySpring.goal];
        propertySpring.velocity.fill(0);
        settled.push(key);
      }
      patch[key] = composeAnimationValue(
        propertySpring.kind,
        propertySpring.current,
      ) as Props[keyof Props];
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
  const angularFrequency = Math.sqrt(options.tension / options.mass);
  const dampingRatio = options.friction / (2 * Math.sqrt(options.mass * options.tension));

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

function resolveOptions(
  options: SpringOptions,
  fallback: ResolvedSpringOptions,
): ResolvedSpringOptions {
  const precision = options.precision ?? fallback.precision;
  const resolved: ResolvedSpringOptions = {
    tension: options.tension ?? fallback.tension,
    friction: options.friction ?? fallback.friction,
    mass: options.mass ?? fallback.mass,
    precision,
    restVelocity:
      options.restVelocity ??
      (options.precision === undefined ? fallback.restVelocity : precision * (1000 / 16)),
  };
  assertPositiveFinite(resolved.tension, 'Spring tension');
  assertPositiveFinite(resolved.friction, 'Spring friction');
  assertPositiveFinite(resolved.mass, 'Spring mass');
  assertPositiveFinite(resolved.precision, 'Spring precision');
  assertPositiveFinite(resolved.restVelocity, 'Spring rest velocity');
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
