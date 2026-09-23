/** FrameKit's tree-shakeable public API. */
export { spring } from './animation/spring/spring.js';
export type { SpringController, SpringOptions } from './animation/spring/controller.js';
export type { AnimationGoal } from './animation/runtime/types.js';
export { createTween } from './animation/tween/tween.js';
export type {
  EasingDirection,
  EasingStyle,
  Tween,
  TweenGoal,
  TweenOptions,
  TweenPlaybackState,
} from './animation/tween/tween.js';

export { createFrame } from './elements/frame.js';
export type { Frame, FrameOptions, FrameProperties, FrameTagName } from './elements/frame.js';
export type { AutomaticSize, GuiObject, GuiObjectProperties } from './elements/gui-object.js';
export { createImageButton, createImageLabel } from './elements/image.js';
export type {
  ImageButton,
  ImageButtonProperties,
  ImageLabel,
  ImageLabelOptions,
  ImageLabelProperties,
  ImageLabelTagName,
  ScaleType,
} from './elements/image.js';
export { createLink } from './elements/link.js';
export type { Link, LinkProperties, LinkTarget } from './elements/link.js';
export { createScreenGui } from './elements/screen-gui.js';
export type { ScreenGui, ScreenGuiProperties } from './elements/screen-gui.js';
export { createScrollingFrame } from './elements/scrolling-frame.js';
export type {
  ScrollingDirection,
  ScrollingFrame,
  ScrollingFrameMethods,
  ScrollingFrameOptions,
  ScrollingFrameProperties,
  ScrollingFrameTagName,
} from './elements/scrolling-frame.js';
export { createTextButton, createTextLabel } from './elements/text.js';
export type {
  TextButton,
  TextButtonProperties,
  TextLabel,
  TextLabelOptions,
  TextLabelProperties,
  TextTagName,
  TextXAlignment,
  TextYAlignment,
} from './elements/text.js';
export { createTextInput } from './elements/text-input.js';
export type { TextInput, TextInputProperties, TextInputType } from './elements/text-input.js';
export { createTextArea } from './elements/text-area.js';
export type {
  TextArea,
  TextAreaProperties,
  TextAreaResizeDirection,
} from './elements/text-area.js';

export { bindHoverScale } from './helpers/hover-scale.js';
export { bindPopover } from './helpers/popover.js';
export type { PopoverOptions } from './helpers/popover.js';
export { bindResponsiveLayout } from './helpers/responsive-layout.js';
export type { ResponsiveLayoutOptions } from './helpers/responsive-layout.js';
export { bindTooltip } from './helpers/tooltip.js';
export type { TooltipOptions, TooltipPlacement, TooltipStyle } from './helpers/tooltip.js';
export type {
  FloatingPanelContext,
  FloatingPanelHook,
  FloatingPanelPlacement,
} from './helpers/floating-panel/types.js';

export type { DomOptions } from './internal/dom/environment.js';
export { installFrameKitStyles } from './internal/dom/stylesheet.js';
export type { StyleOptions } from './internal/dom/stylesheet.js';
export type { InstanceClassName, InstanceOf } from './internal/runtime/node/class-map.js';
export type { GuiElement, GuiGeometry } from './internal/runtime/node/gui-node.js';
export type { Instance, InstanceProperties } from './internal/runtime/node/instance.js';
export type { LayoutModifier, StyleModifier } from './internal/runtime/node/modifier-types.js';

export { createUIAspectRatioConstraint } from './modifiers/aspect-ratio.js';
export type {
  AspectType,
  DominantAxis,
  UIAspectRatioConstraint,
  UIAspectRatioConstraintProperties,
} from './modifiers/aspect-ratio.js';
export { createUICorner } from './modifiers/corner.js';
export type { UICorner, UICornerProperties } from './modifiers/corner.js';
export { createUIGradient } from './modifiers/gradient.js';
export type { GradientTarget, UIGradient, UIGradientProperties } from './modifiers/gradient.js';
export { createUIListLayout } from './modifiers/list-layout.js';
export type {
  FillDirection,
  HorizontalAlignment,
  SortOrder,
  UIListLayout,
  UIListLayoutProperties,
  VerticalAlignment,
} from './modifiers/list-layout.js';
export { createUIPadding } from './modifiers/padding.js';
export type { UIPadding, UIPaddingProperties } from './modifiers/padding.js';
export { createUIScale } from './modifiers/scale.js';
export type { UIScale, UIScaleProperties } from './modifiers/scale.js';
export { createUIShadow } from './modifiers/shadow.js';
export type { UIShadow, UIShadowProperties } from './modifiers/shadow.js';
export { createUIStroke } from './modifiers/stroke.js';
export type { BorderStrokePosition, UIStroke, UIStrokeProperties } from './modifiers/stroke.js';
export { createUITextStroke } from './modifiers/text-stroke.js';
export type { UITextStroke, UITextStrokeProperties } from './modifiers/text-stroke.js';

export { createSignalEmitter } from './state/signal.js';
export type { Signal, SignalEmitter, Unsubscribe } from './state/signal.js';
export { createObservableValue } from './state/value.js';
export type { ObservableValue } from './state/value.js';

export { color3FromHex, color3FromRGB } from './values/color3.js';
export type { Color3 } from './values/color3.js';
export { colorSequence, numberSequence } from './values/sequence.js';
export type {
  ColorSequence,
  ColorSequenceKeypoint,
  NumberSequence,
  NumberSequenceKeypoint,
} from './values/sequence.js';
export { udim, udim2, udim2FromOffset, udim2FromScale } from './values/udim.js';
export type { UDim, UDim2 } from './values/udim.js';
export { vector2 } from './values/vector2.js';
export type { Vector2 } from './values/vector2.js';
