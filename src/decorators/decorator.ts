import React from 'react';

import { UIStroke } from './UIStroke';
import { UITextStroke } from './UITextStroke';

const Decorators: Set<UIDecorator<any>> = new Set([UIStroke, UITextStroke]);

export function isDecorator(type: unknown): type is UIDecorator<any> {
  return Decorators.has(type as UIDecorator<any>);
}

export type UIDecorator<Props> = React.FunctionComponent<Props> & {
  toCss: (props: Props) => React.CSSProperties;
};

export function createUIDecorator<Props>(
  toCss: (props: Props) => React.CSSProperties,
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
      const css = child.type.toCss(child.props);
      Object.assign(decoratorStyle, css);
      return;
    }
    normalChildren.push(child);
  });
  return { normalChildren, decoratorStyle };
}
