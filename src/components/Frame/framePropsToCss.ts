import type React from 'react';

import { Color4 } from '../../primitives/Color4';
import { UDim2 } from '../../primitives/UDim2';
import { Vector2 } from '../../primitives/Vector2';
import { colorToCss, positionToCss, sizeToCss } from '../../rendering/toCss';
import type { FrameProps } from './types';

const DEFAULT_SIZE = UDim2.fromOffset(100, 100);
const DEFAULT_POSITION = UDim2.fromOffset(50, 50);
const DEFAULT_ANCHOR_POINT = Vector2.new(0, 0);
const DEFAULT_BACKGROUND_COLOR = Color4.rgbt(200, 200, 200, 0);
const DEFAULT_BORDER_COLOR = Color4.rgbt(0, 0, 0, 0);

export function framePropsToCss(props: FrameProps): React.CSSProperties {
  const {
    Size = DEFAULT_SIZE,
    Position = DEFAULT_POSITION,
    AnchorPoint = DEFAULT_ANCHOR_POINT,
    BackgroundColor = DEFAULT_BACKGROUND_COLOR,
    BorderColor = DEFAULT_BORDER_COLOR,
    BorderWidth = 0,
    BorderRadius = 0,
    Visible = true,
    ZIndex = 1,
    ClipDescendants = true,
  } = props;

  return {
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
}
