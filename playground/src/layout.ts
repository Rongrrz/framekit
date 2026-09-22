import { type Instance, type InstanceProperties, type ObservableValue } from 'framekit';

import { watchOwnedValue } from './owned-value';
import type { SitePage } from './router';
import { scrollbarThickness } from './theme';

export type PlaygroundLayout = 'desktop' | 'mobile';
export type Responsive<Value> = Readonly<Record<PlaygroundLayout, Value>>;

export const pageWidth: Responsive<number> = { desktop: 1280, mobile: 390 };
export const mobileBreakpoint = pageWidth.desktop + scrollbarThickness;
export const contentWidth: Responsive<number> = { desktop: 1216, mobile: 358 };

export const pageHeight: Responsive<Readonly<Record<SitePage, number>>> = {
  desktop: { home: 1120, guide: 3686, api: 7140 },
  mobile: { home: 1660, guide: 3836, api: 7240 },
};

/** Keeps one instance responsive without creating separate desktop and mobile trees. */
export const bindLayoutProperties = <Properties extends InstanceProperties>(
  owner: Instance,
  layout: ObservableValue<PlaygroundLayout>,
  instance: Instance<Properties>,
  properties: Responsive<Partial<Properties>>,
): void => {
  watchOwnedValue(owner, layout, (currentLayout) =>
    instance.setProperties(properties[currentLayout]),
  );
};
