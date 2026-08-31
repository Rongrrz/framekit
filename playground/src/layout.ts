import { fk } from 'framekit';

export type PlaygroundLayout = 'desktop' | 'mobile';
export type SectionName = 'hero' | 'guide' | 'footer';
export type SectionMetrics = Readonly<{ top: number; height: number }>;
export type Responsive<Value> = Readonly<Record<PlaygroundLayout, Value>>;

export const mobileBreakpoint = 720;

export const pageWidth: Responsive<number> = { desktop: 1280, mobile: 390 };
export const contentWidth: Responsive<number> = { desktop: 1120, mobile: 358 };

const sectionHeights: Responsive<Readonly<Record<SectionName, number>>> = {
  desktop: { hero: 780, guide: 1380, footer: 520 },
  mobile: { hero: 950, guide: 2380, footer: 700 },
};

const calculateSectionLayout = (
  heights: Readonly<Record<SectionName, number>>,
): Readonly<Record<SectionName, SectionMetrics>> => {
  let top = 0;
  const take = (height: number): SectionMetrics => {
    const section = Object.freeze({ top, height });
    top += height;
    return section;
  };
  return Object.freeze({
    hero: take(heights.hero),
    guide: take(heights.guide),
    footer: take(heights.footer),
  });
};

export const sectionLayout: Responsive<Readonly<Record<SectionName, SectionMetrics>>> = {
  desktop: calculateSectionLayout(sectionHeights.desktop),
  mobile: calculateSectionLayout(sectionHeights.mobile),
};

const calculatePageHeight = (layout: Readonly<Record<SectionName, SectionMetrics>>): number =>
  Object.values(layout).reduce(
    (maximum, section) => Math.max(maximum, section.top + section.height),
    0,
  );

export const pageHeight: Responsive<number> = {
  desktop: calculatePageHeight(sectionLayout.desktop),
  mobile: calculatePageHeight(sectionLayout.mobile),
};

/** Keeps one instance responsive without creating separate desktop and mobile trees. */
export const bindLayoutProperties = <Properties extends fk.InstanceProperties>(
  owner: fk.Instance,
  layout: fk.Value<PlaygroundLayout>,
  instance: fk.Instance<Properties>,
  properties: Responsive<Partial<Properties>>,
): void => {
  owner.watch(layout, (currentLayout) => instance.setProperties(properties[currentLayout]));
};
