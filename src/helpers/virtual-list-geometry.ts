type RowGeometry = Readonly<{
  offset(index: number): number;
  height(index: number): number;
  set(index: number, height: number): void;
  indexAt(position: number): number;
}>;

/** Prefix sums keep measured-row changes and offset lookups logarithmic in collection size. */
export const createRowGeometry = (sizes: readonly number[]): RowGeometry => {
  const heights = [...sizes];
  const sums = new Float64Array(sizes.length + 1);
  for (let index = 1; index < sums.length; index += 1) {
    sums[index] = sums[index]! + heights[index - 1]!;
    const parent = index + (index & -index);
    if (parent < sums.length) {
      sums[parent] = sums[parent]! + sums[index]!;
    }
  }
  const offset = (index: number): number => {
    let total = 0;
    for (let cursor = Math.min(index, heights.length); cursor > 0; cursor -= cursor & -cursor) {
      total += sums[cursor]!;
    }
    return total;
  };
  return {
    offset,
    height: (index: number): number => heights[index] ?? 0,
    set: (index: number, height: number): void => {
      const difference = height - heights[index]!;
      heights[index] = height;
      for (let cursor = index + 1; cursor < sums.length; cursor += cursor & -cursor) {
        sums[cursor] = sums[cursor]! + difference;
      }
    },
    indexAt: (position: number): number => {
      let index = 0;
      let total = 0;
      for (
        let step = 2 ** Math.floor(Math.log2(Math.max(1, heights.length)));
        step > 0;
        step = Math.floor(step / 2)
      ) {
        const next = index + step;
        if (next < sums.length && total + sums[next]! <= position) {
          index = next;
          total += sums[next]!;
        }
      }
      return Math.min(index, Math.max(0, heights.length - 1));
    },
  };
};
