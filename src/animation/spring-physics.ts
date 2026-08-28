import { assertPositiveFinite } from '../shared/runtime/validation';

/** Optional physical and settling behavior for a spring. */
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

export type ResolvedSpringOptions = Required<SpringOptions>;

export const defaultSpringOptions: ResolvedSpringOptions = {
  tension: 170,
  friction: 26,
  mass: 1,
  precision: 0.001,
  restVelocity: 0.0625,
};

const dampingRatioTolerance = 1e-4;

export function resolveSpringOptions(
  options: SpringOptions,
  fallback: ResolvedSpringOptions,
): ResolvedSpringOptions {
  const precision = options.precision ?? fallback.precision;
  const inferredRestVelocity = precision * (1000 / 16);
  const restVelocityFallback =
    options.precision === undefined ? fallback.restVelocity : inferredRestVelocity;
  const resolved: ResolvedSpringOptions = {
    tension: options.tension ?? fallback.tension,
    friction: options.friction ?? fallback.friction,
    mass: options.mass ?? fallback.mass,
    precision,
    restVelocity: options.restVelocity ?? restVelocityFallback,
  };

  assertPositiveFinite(resolved.tension, 'Spring tension');
  assertPositiveFinite(resolved.friction, 'Spring friction');
  assertPositiveFinite(resolved.mass, 'Spring mass');
  assertPositiveFinite(resolved.precision, 'Spring precision');
  assertPositiveFinite(resolved.restVelocity, 'Spring rest velocity');
  return resolved;
}

export function solveSpring(
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

  // Underdamped springs oscillate while their amplitude decays.
  if (dampingRatio < 1 - dampingRatioTolerance) {
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

  // Overdamped springs return without oscillating as two exponential terms.
  if (dampingRatio > 1 + dampingRatioTolerance) {
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

  // At critical damping, both exponential roots are equal.
  const decay = Math.exp(-angularFrequency * deltaTime);
  const coefficient = velocity + angularFrequency * displacement;
  return {
    value: goal + decay * (displacement + coefficient * deltaTime),
    velocity: decay * (velocity - angularFrequency * coefficient * deltaTime),
  };
}
