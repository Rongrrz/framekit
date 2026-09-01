import { createScrollingFrame, type ScrollingFrame } from '../core/elements/scrolling-frame';
import { assertUDim, udim2, type UDim } from '../core/values/udim';
import {
  createLayoutModifier,
  type LayoutModifier,
  type LayoutStyles,
} from '../shared/runtime/modifier';
import type { InstanceProperties } from '../shared/runtime/node';
import { assertNonNegativeFinite } from '../shared/runtime/validation';

/** Options for a full-width scrolling list whose canvas follows its children. */
export type AutoYScrollingFrameOptions = Readonly<{
  /** Visible viewport height relative to the parent. */
  viewportHeight: UDim;
  /** Space in pixels between adjacent children. */
  gap?: number;
}>;

type AutoYListLayoutProperties = InstanceProperties & {
  Gap: number;
};

/** Creates a vertical scrolling list where appended children handle their own height. */
export function createAutoYScrollingFrame(options: AutoYScrollingFrameOptions): ScrollingFrame {
  const gap = options.gap ?? 0;
  assertUDim(options.viewportHeight, 'Viewport height');
  assertNonNegativeFinite(gap, 'Gap');

  const scrollingFrame = createScrollingFrame({
    Size: udim2(1, 0, options.viewportHeight.Scale, options.viewportHeight.Offset),
    ScrollingDirection: 'Y',
    CanvasSize: udim2(1, 0, 0, 0),
    AutomaticCanvasSize: 'Y',
  });
  scrollingFrame.addChild(createAutoYListLayout(gap));
  return scrollingFrame;
}

function createAutoYListLayout(gap: number): LayoutModifier<AutoYListLayoutProperties> {
  return createLayoutModifier<AutoYListLayoutProperties>(
    'UIListLayout',
    { Name: 'AutoYListLayout', Gap: gap },
    (properties, children): LayoutStyles => ({
      parent: {
        display: 'flex',
        'flex-direction': 'column',
        gap: `${properties.Gap}px`,
      },
      children: children.map(() => ({
        position: 'relative',
        left: 'auto',
        top: 'auto',
        width: '100%',
        transform: 'none',
        'flex-shrink': '0',
      })),
    }),
    (properties) => assertNonNegativeFinite(properties.Gap, 'Gap'),
  );
}
