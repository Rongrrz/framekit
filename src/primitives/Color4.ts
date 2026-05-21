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
    this.red = constraintToRGBRange(red);
    this.green = constraintToRGBRange(green);
    this.blue = constraintToRGBRange(blue);
    this.alpha = clamp(alpha, 0, 1);
  }

  public static rgb(red: number, green: number, blue: number): Color4 {
    return new Color4(red, green, blue, 1);
  }

  public static rgba(red: number, green: number, blue: number, alpha: number): Color4 {
    return new Color4(red, green, blue, alpha);
  }

  /**
   * Create a new RGB value with transparency
   */
  public static rgbt(red: number, green: number, blue: number, transparency: number): Color4 {
    transparency = clamp(transparency, 0, 1);
    return new Color4(red, green, blue, 1 - transparency);
  }
}

function constraintToRGBRange(number: number): number {
  return Math.round(clamp(number, 0, 255));
}
