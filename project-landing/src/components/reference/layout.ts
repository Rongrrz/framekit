import appearanceAsOwnedModifiersExample from '../../../examples/layout/appearance-as-owned-modifiers.ts?example';
import letContentDetermineHeightExample from '../../../examples/layout/let-content-determine-height.ts?example';
import nativeScrollingExample from '../../../examples/layout/native-scrolling.ts?example';
import respondToAvailableSpaceExample from '../../../examples/layout/respond-to-available-space.ts?example';
import scalePlusOffsetExample from '../../../examples/layout/scale-plus-offset.ts?example';
import type { ReferenceChapter } from './chapter';

export const layoutChapter = {
  title: 'Layout & styling',
  summary:
    'Understand the coordinate model first. Then use layout modifiers for repeating structures and container breakpoints for responsive behavior.',
  sections: [
    {
      title: 'Scale plus offset',
      body: 'Each UDim is a fraction of the parent plus a pixel offset. udim2(xScale, xOffset, yScale, yOffset) creates both axes. Size and Position use this model; AnchorPoint places a fractional point of the element at Position.',
      code: scalePlusOffsetExample,
      note: 'udim2FromOffset(x, y) means pixels on both axes. udim2FromScale(x, y) means parent fractions. Rotation uses degrees; BackgroundTransparency uses 0 for opaque and 1 for transparent.',
    },
    {
      title: 'Let content determine height',
      body: 'AutomaticSize supports None, X, Y, and XY. Use Y for a column that grows with its children. A UIListLayout controls direct child placement; a UIGridLayout assigns equal cell sizes. LayoutOrder controls ordering by default.',
      code: letContentDetermineHeightExample,
      note: 'A layout modifier owns direct child placement. Removing it restores base geometry. Avoid a percentage height that depends on the auto height of the same parent.',
    },
    {
      title: 'Appearance as owned modifiers',
      body: 'Attach a modifier as a child of the element it styles. UICorner rounds corners; UIStroke draws a border; UIPadding creates internal spacing. UIGradient, UIShadow, UITextStroke, UIScale, and UIAspectRatioConstraint cover more specific effects.',
      code: appearanceAsOwnedModifiersExample,
      note: 'A GUI parent accepts one modifier of each class. Modifiers have no DOM element and cannot have children. They detach and destroy through the same ownership API as elements.',
    },
    {
      title: 'Respond to available space',
      body: 'Observe the component container when its available width matters. Breakpoints are ordered, inclusive upper bounds; the last entry omits maxWidth. apply runs immediately and when the active range changes.',
      code: respondToAvailableSpaceExample,
      note: 'For a viewport layout, use { breakpoint: 960, mobile, desktop } instead. The binding returns a disposer and releases its observer or resize listener with the owner.',
    },
    {
      title: 'Native scrolling',
      body: 'ScrollingFrame uses browser scrolling. Set ScrollingDirection to X, Y, or XY; AutomaticCanvasSize can derive the content extent. CanvasPosition is a Vector2 and synchronizes to the position the browser actually accepts.',
      code: nativeScrollingExample,
      note: 'Use ClipsDescendants on an ordinary Frame for clipping without scrolling. A ScrollingFrame needs a bounded viewport height to create a useful scroll area.',
    },
  ],
} as const satisfies ReferenceChapter;
