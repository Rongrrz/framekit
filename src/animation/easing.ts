/** Curve used to transform tween progress. */
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

/** Portion of an easing curve applied by a tween. */
export type EasingDirection = 'In' | 'Out' | 'InOut';

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

export function assertEasingStyle(value: unknown): asserts value is EasingStyle {
  if (!easingStyles.includes(value as EasingStyle)) {
    throw new TypeError('Unknown tween easing style.');
  }
}

export function assertEasingDirection(value: unknown): asserts value is EasingDirection {
  if (!easingDirections.includes(value as EasingDirection)) {
    throw new TypeError('Unknown tween easing direction.');
  }
}

export function ease(alpha: number, style: EasingStyle, direction: EasingDirection): number {
  const clampedAlpha = Math.min(1, Math.max(0, alpha));
  if (direction === 'In') return easeIn(clampedAlpha, style);
  if (direction === 'Out') return 1 - easeIn(1 - clampedAlpha, style);
  if (clampedAlpha < 0.5) return easeIn(clampedAlpha * 2, style) / 2;
  return 1 - easeIn((1 - clampedAlpha) * 2, style) / 2;
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
