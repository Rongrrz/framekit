export { createFrame } from './elements/frame';
export type { Frame, FrameOptions, FrameProperties, FrameTagName } from './elements/frame';
export { defineGuiObject } from './custom-gui-object';
export type { GuiObjectConstructor, GuiObjectDefinition } from './custom-gui-object';
export type { AutomaticSize, GuiObject, GuiObjectProperties } from './gui-object';

export { createImageButton, createImageLabel } from './elements/image';
export type {
  ImageButton,
  ImageButtonProperties,
  ImageLabel,
  ImageLabelOptions,
  ImageLabelProperties,
  ImageLabelTagName,
  ScaleType,
} from './elements/image';

export { createLink } from './elements/link';
export type { Link, LinkProperties, LinkTarget } from './elements/link';

export { createScreenGui } from './elements/screen-gui';
export type { ScreenGui, ScreenGuiProperties } from './elements/screen-gui';

export { createScrollingFrame } from './elements/scrolling-frame';
export type {
  ScrollingDirection,
  ScrollingFrameMethods,
  ScrollingFrameOptions,
  ScrollingFrame,
  ScrollingFrameProperties,
  ScrollingFrameTagName,
} from './elements/scrolling-frame';

export { createTextButton, createTextLabel } from './elements/text';
export type {
  TextButton,
  TextButtonProperties,
  TextLabel,
  TextLabelOptions,
  TextLabelProperties,
  TextTagName,
  TextXAlignment,
  TextYAlignment,
} from './elements/text';

export { createTextInput } from './elements/text-input';
export type { TextInput, TextInputProperties, TextInputType } from './elements/text-input';

export { createTextArea } from './elements/text-area';
export type { TextArea, TextAreaProperties, TextAreaResizeDirection } from './elements/text-area';

export { createUIAspectRatioConstraint } from './modifiers/aspect-ratio';
export type {
  AspectType,
  DominantAxis,
  UIAspectRatioConstraintProperties,
  UIAspectRatioConstraint,
} from './modifiers/aspect-ratio';
export { createUICorner } from './modifiers/corner';
export type { UICornerProperties, UICorner } from './modifiers/corner';
export { createUIGradient } from './modifiers/gradient';
export type { GradientTarget, UIGradientProperties, UIGradient } from './modifiers/gradient';
export { createUIListLayout } from './modifiers/list-layout';
export type {
  FillDirection,
  HorizontalAlignment,
  VerticalAlignment,
  SortOrder,
  UIListLayoutProperties,
  UIListLayout,
} from './modifiers/list-layout';
export { createUIPadding } from './modifiers/padding';
export type { UIPaddingProperties, UIPadding } from './modifiers/padding';
export { createUIScale } from './modifiers/scale';
export type { UIScaleProperties, UIScale } from './modifiers/scale';
export { createUIShadow } from './modifiers/shadow';
export type { UIShadowProperties, UIShadow } from './modifiers/shadow';
export { createUIStroke } from './modifiers/stroke';
export type { BorderStrokePosition, UIStrokeProperties, UIStroke } from './modifiers/stroke';
export { createUITextStroke } from './modifiers/text-stroke';
export type { UITextStrokeProperties, UITextStroke } from './modifiers/text-stroke';

export { createSignal } from './state/signal';
export type { Signal, SignalEmitter, Unsubscribe } from './state/signal';
export { createValue } from './state/value';
export type { Value } from './state/value';

export { color3FromHex, color3FromRGB } from './values/color3';
export type { Color3 } from './values/color3';
export { udim, udim2, udim2FromOffset, udim2FromScale } from './values/udim';
export type { UDim, UDim2 } from './values/udim';
export { vector2 } from './values/vector2';
export type { Vector2 } from './values/vector2';
export { colorSequence, numberSequence } from './values/sequence';
export type {
  ColorSequence,
  ColorSequenceKeypoint,
  NumberSequence,
  NumberSequenceKeypoint,
} from './values/sequence';

export type {
  GuiElement,
  GuiGeometry,
  Instance,
  InstanceProperties,
  LayoutModifier,
  StyleModifier,
} from './node-service';

export { spring } from '../animation/tween-service/spring';
