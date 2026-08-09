/** An immutable scale-and-offset dimension. */
export type UDim = Readonly<{
  Scale: number;
  Offset: number;
}>;

/** Creates an immutable scale-and-offset dimension. */
export function udim(scale: number, offset: number): UDim {
  return Object.freeze({ Scale: scale, Offset: offset });
}
