export const designWidth = 390;
export const contentWidth = 358;

export const sectionLayout = {
  hero: { top: 0, height: 980 },
  principles: { top: 980, height: 1120 },
  motion: { top: 2100, height: 1150 },
  composer: { top: 3250, height: 1320 },
  values: { top: 4570, height: 980 },
  api: { top: 5550, height: 1180 },
  guide: { top: 6730, height: 1300 },
  lifecycle: { top: 8030, height: 1100 },
  footer: { top: 9130, height: 680 },
} as const;

export const pageHeight = 9810;

export type SectionMetrics = Readonly<{ top: number; height: number }>;
