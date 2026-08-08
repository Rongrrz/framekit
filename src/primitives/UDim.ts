export class UDim {
  public readonly Scale: number;
  public readonly Offset: number;

  public constructor(scale: number, offset: number) {
    this.Scale = scale;
    this.Offset = offset;
  }
}
