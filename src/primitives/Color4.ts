// The consequences of Color4 is that we'd lose IDE support of showing
// a snippet of the color

import { clamp } from '../utils/MathUtils';

// This is where we differentiate from Roblox, as we will just take the RGB values...
export class Color4 {
  public readonly red: number;
  public readonly green: number;
  public readonly blue: number;
  public readonly alpha: number;

  private constructor(red: number, green: number, blue: number, alpha: number) {
    this.red = constrainToRGBRange(red);
    this.green = constrainToRGBRange(green);
    this.blue = constrainToRGBRange(blue);
    this.alpha = clamp(alpha, 0, 1);
  }

  public static rgba(red: number, green: number, blue: number, alpha: number): Color4 {
    return new Color4(red, green, blue, alpha);
  }
  /**
   * Create a new RGB value with transparency
   */
  public static rgbt(red: number, green: number, blue: number, transparency: number): Color4 {
    const alpha = 1 - clamp(transparency, 0, 1);
    return new Color4(red, green, blue, alpha);
  }

  public static hext(hex: string, transparency: number = 0): Color4 {
    if (!is6DigitHex(hex)) {
      throw new TypeError(`Expected a hex color in #RRGGBB format, got "${hex}".`);
    }

    const alpha = 1 - clamp(transparency, 0, 1);
    const rgb = hexToRGB(hex);

    return new Color4(rgb.red, rgb.green, rgb.blue, alpha);
  }
}

function constrainToRGBRange(number: number): number {
  return Math.round(clamp(number, 0, 255));
}

function is6DigitHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function hexToRGB(value: string): { red: number; green: number; blue: number } {
  const redHex = value.slice(1, 3);
  const greenHex = value.slice(3, 5);
  const blueHex = value.slice(5, 7);

  return {
    red: Number.parseInt(redHex, 16),
    green: Number.parseInt(greenHex, 16),
    blue: Number.parseInt(blueHex, 16),
  };
}
