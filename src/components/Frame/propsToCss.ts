import type React from 'react';

import { colorToCss, positionToCss, sizeToCss } from '../../rendering/toCss';
import { DEFAULT_FRAME_PROPS } from './defaults';
import type { FrameProps } from './types';

export function framePropsToCss(props: FrameProps): React.CSSProperties {
  const frameProps = { ...DEFAULT_FRAME_PROPS, ...props };

  const visible = frameProps.Visible ? undefined : 'none';
  const clipDescendants = frameProps.ClipDescendants ? 'hidden' : 'visible';

  return {
    position: 'absolute',
    ...positionToCss(frameProps.Position, frameProps.AnchorPoint),
    ...sizeToCss(frameProps.Size),
    backgroundColor: colorToCss(frameProps.BackgroundColor),
    display: visible,
    zIndex: frameProps.ZIndex,
    overflow: clipDescendants,
  };
}
