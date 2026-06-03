import type { CSSProperties, ElementType } from 'react';

import type { Color4 } from '../../primitives/Color4';
import type { UDim2 } from '../../primitives/UDim2';
import type { Vector2 } from '../../primitives/Vector2';
import type { NonTextChildren } from '../../types';

/**
 * Props for Frame, the base rectangular UI container.
 *
 * Text children are intentionally rejected. Use TextLabel.Text for text content,
 * and reserve children for element children.
 */
export interface FrameProps {
  /** The element or component used to render the Frame. */
  as?: ElementType;

  /** Element children rendered inside the Frame. */
  children?: NonTextChildren;

  /** Optional CSS class applied to the rendered element. */
  className?: string;

  /** Final style override applied after Frame styles and decorator styles. */
  styleOverride?: CSSProperties;

  /** Size of the Frame. */
  Size?: UDim2;

  /** Position of the Frame. */
  Position?: UDim2;

  /** Anchor point used when resolving Position. */
  AnchorPoint?: Vector2;

  /** Background color of the Frame. */
  BackgroundColor?: Color4;

  /** Whether the Frame is rendered visibly. */
  Visible?: boolean;

  /** CSS stacking order. */
  ZIndex?: number;

  /** Whether child content is clipped to the Frame bounds. */
  ClipDescendants?: boolean;
}
