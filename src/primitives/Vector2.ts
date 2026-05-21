// This is really only for AnchorPoint
export class Vector2 {
  public readonly X: number;
  public readonly Y: number;

  private constructor(x: number, y: number) {
    this.X = x;
    this.Y = y;
  }

  public static new(x: number, y: number): Vector2 {
    return new Vector2(x, y);
  }
}
