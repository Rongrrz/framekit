export type SectionMetrics = Readonly<{ top: number; height: number }>;

type SectionLayout<Heights extends Record<string, number>> = Readonly<{
  sections: Readonly<{ [Section in keyof Heights]: SectionMetrics }>;
  pageHeight: number;
}>;

/** Calculates section offsets and total page height from one ordered height map. */
export function defineSectionLayout<const Heights extends Record<string, number>>(
  heights: Heights,
): SectionLayout<Heights> {
  let top = 0;
  const sections: Partial<Record<keyof Heights, SectionMetrics>> = {};

  for (const section of Object.keys(heights) as (keyof Heights)[]) {
    const height = heights[section]!;
    sections[section] = Object.freeze({ top, height });
    top += height;
  }

  return Object.freeze({
    sections: Object.freeze(sections) as Readonly<{
      [Section in keyof Heights]: SectionMetrics;
    }>,
    pageHeight: top,
  });
}
