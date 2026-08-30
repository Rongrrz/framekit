import { fk } from 'framekit';

export type PlaygroundLayout = 'desktop' | 'mobile';
export type SectionName = 'hero' | 'motion' | 'modifiers' | 'api' | 'lifecycle' | 'footer';
export type SectionMetrics = Readonly<{ top: number; height: number }>;
export type Responsive<Value> = Readonly<Record<PlaygroundLayout, Value>>;

export const mobileBreakpoint = 720;

export const pageWidth: Responsive<number> = {
  desktop: 1280,
  mobile: 390,
};

export const contentWidth: Responsive<number> = {
  desktop: 1160,
  mobile: 358,
};

export const contentInset: Responsive<number> = {
  desktop: 60,
  mobile: 16,
};

const sectionHeights: Responsive<Readonly<Record<SectionName, number>>> = {
  desktop: {
    hero: 900,
    motion: 980,
    modifiers: 1060,
    api: 820,
    lifecycle: 760,
    footer: 680,
  },
  mobile: {
    hero: 1120,
    motion: 1260,
    modifiers: 1900,
    api: 1040,
    lifecycle: 980,
    footer: 820,
  },
};

export const sectionLayout: Responsive<Readonly<Record<SectionName, SectionMetrics>>> = {
  desktop: calculateSectionLayout(sectionHeights.desktop),
  mobile: calculateSectionLayout(sectionHeights.mobile),
};

export const pageHeight: Responsive<number> = {
  desktop: calculatePageHeight(sectionLayout.desktop),
  mobile: calculatePageHeight(sectionLayout.mobile),
};

/** Keeps one instance responsive without creating separate desktop and mobile trees. */
export function bindLayoutProperties<Properties extends fk.InstanceProperties>(
  owner: fk.Instance,
  layout: fk.Value<PlaygroundLayout>,
  instance: fk.Instance<Properties>,
  properties: Responsive<Partial<Properties>>,
): void {
  owner.watch(layout, (currentLayout) => instance.setProperties(properties[currentLayout]));
}

function calculateSectionLayout(
  heights: Readonly<Record<SectionName, number>>,
): Readonly<Record<SectionName, SectionMetrics>> {
  let top = 0;
  function take(height: number): SectionMetrics {
    const section = Object.freeze({ top, height });
    top += height;
    return section;
  }

  return Object.freeze({
    hero: take(heights.hero),
    motion: take(heights.motion),
    modifiers: take(heights.modifiers),
    api: take(heights.api),
    lifecycle: take(heights.lifecycle),
    footer: take(heights.footer),
  });
}

function calculatePageHeight(layout: Readonly<Record<SectionName, SectionMetrics>>): number {
  return Object.values(layout).reduce(
    (maximum, section) => Math.max(maximum, section.top + section.height),
    0,
  );
}
