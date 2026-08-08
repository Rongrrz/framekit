import { UDim } from './UDim';

export class UDim2 {
  public readonly X: UDim;
  public readonly Y: UDim;

  public constructor(xScale: number, xOffset: number, yScale: number, yOffset: number) {
    this.X = new UDim(xScale, xOffset);
    this.Y = new UDim(yScale, yOffset);
  }

  public static fromScale(xScale: number, yScale: number): UDim2 {
    return new UDim2(xScale, 0, yScale, 0);
  }

  public static fromOffset(xOffset: number, yOffset: number): UDim2 {
    return new UDim2(0, xOffset, 0, yOffset);
  }
}
