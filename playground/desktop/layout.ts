import { defineSectionLayout } from '../shared/section-layout';

export const designWidth = 1280;
export const contentWidth = 1120;

const layout = defineSectionLayout({
  hero: 840,
  principles: 720,
  motion: 920,
  composer: 920,
  values: 840,
  api: 840,
  guide: 980,
  lifecycle: 840,
  footer: 700,
});

export const sectionLayout = layout.sections;
export const pageHeight = layout.pageHeight;
