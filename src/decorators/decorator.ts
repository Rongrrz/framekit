import React from 'react';

import { UIStroke } from './UIStroke';

const Decorators: Set<UIDecorator<any>> = new Set([UIStroke]);

export function isDecorator(type: unknown): type is UIDecorator<any> {
  return Decorators.has(type as UIDecorator<any>);
}

export type HostType =
  | 'Frame'
  | 'TextLabel'
  | 'TextButton'
  | 'ImageLabel'
  | 'ImageButton'
  | 'ScrollingFrame';

export function isTextHost(hostType: HostType): boolean {
  return hostType === 'TextLabel' || hostType === 'TextButton';
}

export type UIDecorator<Props> = React.FunctionComponent<Props> & {
  toCss: (props: Props, hostType: HostType) => React.CSSProperties;
};

export function createUIDecorator<Props>(
  toCss: (props: Props, hostType: HostType) => React.CSSProperties,
): UIDecorator<Props> {
  const component = () => null;
  component.toCss = toCss;
  return component;
}

export function extractDecorators(children: React.ReactNode): {
  normalChildren: React.ReactNode;
  decoratorStyle: React.CSSProperties;
} {
  const normalChildren: React.ReactNode[] = [];
  const decoratorStyle: React.CSSProperties = {};
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (typeof child.type === 'string') {
      normalChildren.push(child);
      return;
    }
    if (isDecorator(child.type)) {
      const css = child.type.toCss(child.props, 'Frame');
      Object.assign(decoratorStyle, css);
      return;
    }
    normalChildren.push(child);
  });
  return { normalChildren, decoratorStyle };
}
