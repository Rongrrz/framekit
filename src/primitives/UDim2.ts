import { UDim } from './UDim';

export class UDim2 {
  public readonly X: UDim;
  public readonly Y: UDim;

  private constructor(xScale: number, xOffset: number, yScale: number, yOffset: number) {
    this.X = UDim.new(xScale, xOffset);
    this.Y = UDim.new(yScale, yOffset);
  }

  public static new(xScale: number, xOffset: number, yScale: number, yOffset: number): UDim2 {
    return new UDim2(xScale, xOffset, yScale, yOffset);
  }

  public static fromScale(xScale: number, yScale: number): UDim2 {
    return new UDim2(xScale, 0, yScale, 0);
  }

  public static fromOffset(xOffset: number, yOffset: number): UDim2 {
    return new UDim2(0, xOffset, 0, yOffset);
  }
}
