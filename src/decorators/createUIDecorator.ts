import React from 'react';

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
