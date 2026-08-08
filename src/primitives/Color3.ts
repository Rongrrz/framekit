import { MathUtils } from '../utils/MathUtils';

/** An immutable RGB color. Components are stored as integers from 0 to 255. */
export class Color3 {
  public readonly R: number;
  public readonly G: number;
  public readonly B: number;

  public constructor(red: number, green: number, blue: number) {
    this.R = MathUtils.clampColor(red);
    this.G = MathUtils.clampColor(green);
    this.B = MathUtils.clampColor(blue);
  }

  public static fromRGB(red: number, green: number, blue: number): Color3 {
    return new Color3(red, green, blue);
  }

  public static fromHex(hex: string): Color3 {
    // This checks if it's in the form #XXYYZZ
    if (!/^#[\dA-Fa-f]{6}$/.test(hex)) {
      throw new TypeError(`Expected a color in #RRGGBB format, got "${hex}".`);
    }
    return new Color3(
      Number.parseInt(hex.slice(1, 3), 16),
      Number.parseInt(hex.slice(3, 5), 16),
      Number.parseInt(hex.slice(5, 7), 16),
    );
  }

  public toCSS(transparency: number = 0): string {
    return `rgb(${this.R} ${this.G} ${this.B} / ${1 - MathUtils.clamp(transparency, 0, 1)})`;
  }
}
