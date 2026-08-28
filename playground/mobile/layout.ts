import { defineSectionLayout, type SectionMetrics } from '../shared/section-layout';

export const designWidth = 390;
export const contentWidth = 358;

const layout = defineSectionLayout({
  hero: 980,
  principles: 1120,
  motion: 1150,
  composer: 1320,
  values: 980,
  api: 1180,
  guide: 1300,
  lifecycle: 1100,
  footer: 680,
});

export const sectionLayout = layout.sections;
export const pageHeight = layout.pageHeight;
export type { SectionMetrics };
