import { clamp, clampColor } from '../utils/math';

/** An immutable RGB color whose components are integers from 0 to 255. */
export type Color3 = Readonly<{
  R: number;
  G: number;
  B: number;
}>;

/** Creates an immutable RGB color, rounding and constraining each component. */
export function color3(red: number, green: number, blue: number): Color3 {
  return Object.freeze({ R: clampColor(red), G: clampColor(green), B: clampColor(blue) });
}

/** Parses an immutable RGB color from the `#RRGGBB` format. */
export function color3FromHex(hex: string): Color3 {
  if (!/^#[\dA-Fa-f]{6}$/.test(hex)) {
    throw new TypeError(`Expected a color in #RRGGBB format, got "${hex}".`);
  }
  return color3(
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  );
}

/** Converts a color and Roblox-style transparency to a CSS color string. */
export function color3ToCss(value: Color3, transparency = 0): string {
  return `rgb(${value.R} ${value.G} ${value.B} / ${1 - clamp(transparency, 0, 1)})`;
}
