export class UDim {
  public readonly Scale: number;
  public readonly Offset: number;

  private constructor(scale: number, offset: number) {
    this.Scale = scale;
    this.Offset = offset;
  }

  public static new(scale: number, offset: number): UDim {
    return new UDim(scale, offset);
  }
}
