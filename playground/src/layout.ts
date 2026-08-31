import { fk } from 'framekit';

import type { SitePage } from './router';

export type PlaygroundLayout = 'desktop' | 'mobile';
export type Responsive<Value> = Readonly<Record<PlaygroundLayout, Value>>;

export const mobileBreakpoint = 720;
export const pageWidth: Responsive<number> = { desktop: 1280, mobile: 390 };
export const contentWidth: Responsive<number> = { desktop: 1216, mobile: 358 };

export const pageHeight: Responsive<Readonly<Record<SitePage, number>>> = {
  desktop: { home: 1120, guide: 3300, api: 5250 },
  mobile: { home: 1660, guide: 3450, api: 5350 },
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
