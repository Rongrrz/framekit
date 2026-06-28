import React from 'react';

import { extractDecorators } from '../../decorators/helpers';
import { framePropsToCss } from './propsToCss';
import type { FrameProps } from './types';

export function Frame(props: FrameProps) {
  const { as = 'div', children, className, styleOverride } = props;

  const { normalChildren, decoratorStyle } = extractDecorators(children);

  const computedStyle: React.CSSProperties = {
    ...framePropsToCss(props),
    ...decoratorStyle,
    ...styleOverride,
  };

  // React.createElement expects:
  // - Element to create (div, article, etc.)
  // - {className, style}
  // - children
  return React.createElement(
    as,
    {
      className,
      style: computedStyle,
    },
    normalChildren,
  );
}
