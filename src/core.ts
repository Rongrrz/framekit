export { createFrame } from './core/elements/frame';
export type { Frame, FrameProperties } from './core/elements/frame';
export { defineGuiObject } from './core/custom-gui-object';
export type { GuiObjectConstructor, GuiObjectDefinition } from './core/custom-gui-object';
export type { AutomaticSize, GuiObject, GuiObjectProperties } from './core/gui-object';

export { createImageButton, createImageLabel } from './core/elements/image';
export type {
  ImageButton,
  ImageButtonProperties,
  ImageLabel,
  ImageLabelProperties,
  ScaleType,
} from './core/elements/image';

export { createScreenGui } from './core/elements/screen-gui';
export type { ScreenGui, ScreenGuiProperties } from './core/elements/screen-gui';

export { createScrollingFrame } from './core/elements/scrolling-frame';
export type {
  ScrollingDirection,
  ScrollingFrameMethods,
  ScrollingFrame,
  ScrollingFrameProperties,
} from './core/elements/scrolling-frame';

export { createTextButton, createTextLabel } from './core/elements/text';
export type {
  TextButton,
  TextButtonProperties,
  TextLabel,
  TextLabelProperties,
  TextXAlignment,
  TextYAlignment,
} from './core/elements/text';

export { createTextBox } from './core/elements/text-box';
export type { TextBox, TextBoxProperties } from './core/elements/text-box';

export * from './core/modifiers/aspect-ratio';
export * from './core/modifiers/corner';
export * from './core/modifiers/gradient';
export * from './core/modifiers/list-layout';
export * from './core/modifiers/padding';
export * from './core/modifiers/scale';
export * from './core/modifiers/shadow';
export * from './core/modifiers/stroke';

export { createSignal } from './shared/runtime/signal';
export type { Signal, SignalEmitter, Unsubscribe } from './shared/runtime/signal';
export { createValue } from './shared/runtime/value';
export type { Value } from './shared/runtime/value';

export { color3FromHex, color3FromRGB } from './core/values/color3';
export type { Color3 } from './core/values/color3';
export { udim, udim2, udim2FromOffset, udim2FromScale } from './core/values/udim';
export type { UDim, UDim2 } from './core/values/udim';
export { vector2 } from './core/values/vector2';
export type { Vector2 } from './core/values/vector2';
export { colorSequence, numberSequence } from './core/values/sequence';
export type {
  ColorSequence,
  ColorSequenceKeypoint,
  NumberSequence,
  NumberSequenceKeypoint,
} from './core/values/sequence';

export type { LayoutModifier, StyleModifier } from './shared/runtime/modifier';
export type { GuiGeometry, GuiElement } from './shared/runtime/render';
export type { Instance, InstanceProperties } from './shared/runtime/node';
