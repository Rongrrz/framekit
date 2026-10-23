import {
  watchOwnedValue,
  type Instance,
  type InstanceProperties,
  type ObservableValue,
} from 'framekit';

export type LandingLayout = 'desktop' | 'mobile';

export type Responsive<Value> = Readonly<Record<LandingLayout, Value>>;

export const mobileBreakpoint = 960;

export const navigationHeight = 64;

/** Keeps one instance responsive without creating separate desktop and mobile trees. */
export const bindLayoutProperties = <Properties extends InstanceProperties>(
  owner: Instance,
  layout: ObservableValue<LandingLayout>,
  instance: Instance<Properties>,
  properties: Responsive<Partial<Properties>>,
): void => {
  watchOwnedValue(owner, layout, (currentLayout) =>
    instance.setProperties(properties[currentLayout]),
  );
};
