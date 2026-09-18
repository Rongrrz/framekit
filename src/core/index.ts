export { createFrame } from './elements/frame.js';
export type { Frame, FrameOptions, FrameProperties, FrameTagName } from './elements/frame.js';
export type { DomOptions } from './dom/environment.js';
export { installStyles } from './dom/stylesheet.js';
export type { StyleOptions } from './dom/stylesheet.js';
export type { InstanceClassName, InstanceOf } from './node/classes.js';
export type { AutomaticSize, GuiObject, GuiObjectProperties } from './gui-object.js';

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
  ScrollingFrameMethods,
  ScrollingFrameOptions,
  ScrollingFrame,
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

export { createUIAspectRatioConstraint } from './modifiers/aspect-ratio.js';
export type {
  AspectType,
  DominantAxis,
  UIAspectRatioConstraintProperties,
  UIAspectRatioConstraint,
} from './modifiers/aspect-ratio.js';
export { createUICorner } from './modifiers/corner.js';
export type { UICornerProperties, UICorner } from './modifiers/corner.js';
export { createUIGradient } from './modifiers/gradient.js';
export type { GradientTarget, UIGradientProperties, UIGradient } from './modifiers/gradient.js';
export { createUIListLayout } from './modifiers/list-layout.js';
export type {
  FillDirection,
  HorizontalAlignment,
  VerticalAlignment,
  SortOrder,
  UIListLayoutProperties,
  UIListLayout,
} from './modifiers/list-layout.js';
export { createUIPadding } from './modifiers/padding.js';
export type { UIPaddingProperties, UIPadding } from './modifiers/padding.js';
export { createUIScale } from './modifiers/scale.js';
export type { UIScaleProperties, UIScale } from './modifiers/scale.js';
export { createUIShadow } from './modifiers/shadow.js';
export type { UIShadowProperties, UIShadow } from './modifiers/shadow.js';
export { createUIStroke } from './modifiers/stroke.js';
export type { BorderStrokePosition, UIStrokeProperties, UIStroke } from './modifiers/stroke.js';
export { createUITextStroke } from './modifiers/text-stroke.js';
export type { UITextStrokeProperties, UITextStroke } from './modifiers/text-stroke.js';

export { createSignal } from './state/signal.js';
export type { Signal, SignalEmitter, Unsubscribe } from './state/signal.js';
export { createValue } from './state/value.js';
export type { Value } from './state/value.js';

export { color3FromHex, color3FromRGB } from './values/color3.js';
export type { Color3 } from './values/color3.js';
export { udim, udim2, udim2FromOffset, udim2FromScale } from './values/udim.js';
export type { UDim, UDim2 } from './values/udim.js';
export { vector2 } from './values/vector2.js';
export type { Vector2 } from './values/vector2.js';
export { colorSequence, numberSequence } from './values/sequence.js';
export type {
  ColorSequence,
  ColorSequenceKeypoint,
  NumberSequence,
  NumberSequenceKeypoint,
} from './values/sequence.js';

export type {
  GuiElement,
  GuiGeometry,
  Instance,
  InstanceProperties,
  LayoutModifier,
  StyleModifier,
} from './node/index.js';
