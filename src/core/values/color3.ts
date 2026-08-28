import { assertFiniteNumber } from '../../shared/runtime/validation';

/** An immutable RGB color whose components are integers from 0 to 255. */
export type Color3 = Readonly<{
  /** Red channel from 0 to 255. */
  R: number;
  /** Green channel from 0 to 255. */
  G: number;
  /** Blue channel from 0 to 255. */
  B: number;
}>;

/** Creates an immutable RGB color, rounding and constraining each component. */
export function color3FromRGB(red: number, green: number, blue: number): Color3 {
  return Object.freeze({ R: colorChannel(red), G: colorChannel(green), B: colorChannel(blue) });
}

/** Parses an immutable RGB color from the `#RRGGBB` format. */
export function color3FromHex(hex: string): Color3 {
  if (!/^#[\dA-Fa-f]{6}$/.test(hex)) {
    throw new TypeError(`Expected a color in #RRGGBB format, got "${hex}".`);
  }
  return color3FromRGB(
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  );
}

/** Converts a color and Roblox-style transparency to a CSS color string. */
export function color3ToCss(value: Color3, transparency = 0): string {
  const alpha = 1 - clamp(transparency, 0, 1);
  return `rgb(${value.R} ${value.G} ${value.B} / ${alpha})`;
}

export function assertColor3(value: Color3, name = 'Color3'): void {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError(`${name} must contain valid R, G, and B channels.`);
  }
  for (const channel of [value.R, value.G, value.B]) {
    if (!Number.isInteger(channel) || channel < 0 || channel > 255) {
      throw new TypeError(`${name} channels must be integers from 0 to 255.`);
    }
  }
}

function colorChannel(value: number): number {
  assertFiniteNumber(value, 'Color component');
  return Math.round(clamp(value, 0, 255));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
