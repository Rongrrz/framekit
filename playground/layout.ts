import { defineSectionLayout } from './section-layout';

export const designWidth = 390;
export const contentWidth = 358;
export const mobileBreakpoint = 720;

export type PlaygroundLayout = 'desktop' | 'mobile';

export const maximumPageScale: Readonly<Record<PlaygroundLayout, number>> = {
  desktop: 1.5,
  mobile: 1,
};

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
