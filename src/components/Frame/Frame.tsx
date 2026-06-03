import React from 'react';

import { extractDecorators } from '../../decorators/decorator';
import { framePropsToCss } from './framePropsToCss';
import type { FrameProps } from './types';

export function Frame(props: FrameProps) {
  const {
    as = 'div',
    children,
    className,
    styleOverride,
    Size,
    Position,
    AnchorPoint,
    BackgroundColor,
    BorderColor,
    BorderWidth,
    BorderRadius,
    Visible,
    ZIndex,
    ClipDescendants,
  } = props;

  const { normalChildren, decoratorStyle } = extractDecorators(children);
  const frameStyle = framePropsToCss({
    Size,
    Position,
    AnchorPoint,
    BackgroundColor,
    BorderColor,
    BorderWidth,
    BorderRadius,
    Visible,
    ZIndex,
    ClipDescendants,
  });
  const computedStyle: React.CSSProperties = {
    ...frameStyle,
    ...decoratorStyle,
    ...styleOverride,
  };

  return React.createElement(
    as,
    {
      className,
      style: computedStyle,
    },
    normalChildren,
  );
}
