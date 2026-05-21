import React from 'react';

import { Color4 } from '../primitives/Color4';
import { UDim2 } from '../primitives/UDim2';
import { Vector2 } from '../primitives/Vector2';
import { colorToCss, positionToCss, sizeToCss } from '../rendering/toCss';

type FrameProps = {
  as?: React.ElementType;
  children?: React.ReactNode;

  Size: UDim2;
  Position: UDim2;
  AnchorPoint?: Vector2;
  BackgroundColor?: Color4;
  BorderColor?: Color4;
  BorderWidth?: number;
  BorderRadius?: number;
  Visible?: boolean;
  ZIndex?: number;
  ClipDescendants?: boolean;

  className?: string;
  style?: React.CSSProperties;
};

export function Frame(props: FrameProps) {
  const {
    as = 'div',
    children,
    Size = UDim2.fromOffset(100, 100),
    Position = UDim2.fromOffset(50, 50),
    AnchorPoint = Vector2.new(0, 0),
    BackgroundColor = Color4.rgbt(200, 200, 200, 0),
    BorderColor = Color4.rgbt(0, 0, 0, 0),
    BorderWidth = 0,
    BorderRadius = 0,
    Visible = true,
    ZIndex = 1,
    ClipDescendants = true,
    className,
    style,
    ...rest
  } = props;

  const frameStyle: React.CSSProperties = {
    position: 'absolute',
    ...positionToCss(Position, AnchorPoint),
    ...sizeToCss(Size),
    backgroundColor: colorToCss(BackgroundColor),
    borderColor: colorToCss(BorderColor),
    borderWidth: `${BorderWidth}px`,
    borderRadius: `${BorderRadius}px`,
    borderStyle: BorderWidth > 0 ? 'solid' : undefined,
    display: Visible ? undefined : 'none',
    zIndex: ZIndex,
    overflow: ClipDescendants ? 'hidden' : 'visible',
  };

  const computedStyle: React.CSSProperties = {
    ...frameStyle,
    ...style,
  };

  return React.createElement(
    as,
    {
      ...rest,
      className,
      style: computedStyle,
    },
    children,
  );
}
