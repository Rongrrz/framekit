import {
  watchOwnedValue,
  type Instance,
  type InstanceProperties,
  type ObservableValue,
} from 'framekit';

export type PlaygroundLayout = 'desktop' | 'mobile';

export type Responsive<Value> = Readonly<Record<PlaygroundLayout, Value>>;

export const mobileBreakpoint = 960;

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
