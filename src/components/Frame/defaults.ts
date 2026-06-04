import { Color4 } from '../../primitives/Color4';
import { UDim2 } from '../../primitives/UDim2';
import { Vector2 } from '../../primitives/Vector2';
import type { FrameProps } from './types';

const DEFAULT_SIZE = UDim2.fromOffset(100, 100);
const DEFAULT_POSITION = UDim2.fromOffset(50, 50);
const DEFAULT_ANCHOR_POINT = Vector2.new(0, 0);
const DEFAULT_BACKGROUND_COLOR = Color4.rgbt(200, 200, 200, 0);
const DEFUALT_VISIBILITY = true;
const DEFAULT_Z_INDEX = 1;
const DEFAULT_CLIP_DESCENDANTS = true;

export const DEFAULT_FRAME_PROPS = {
  Size: DEFAULT_SIZE,
  Position: DEFAULT_POSITION,
  AnchorPoint: DEFAULT_ANCHOR_POINT,
  BackgroundColor: DEFAULT_BACKGROUND_COLOR,
  Visible: DEFUALT_VISIBILITY,
  ZIndex: DEFAULT_Z_INDEX,
  ClipDescendants: DEFAULT_CLIP_DESCENDANTS,
} satisfies FrameProps;
