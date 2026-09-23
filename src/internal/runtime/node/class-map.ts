import type { Frame } from '#elements/frame.js';
import type { ImageButton, ImageLabel } from '#elements/image.js';
import type { Link } from '#elements/link.js';
import type { ScreenGui } from '#elements/screen-gui.js';
import type { ScrollingFrame } from '#elements/scrolling-frame.js';
import type { TextArea } from '#elements/text-area.js';
import type { TextInput } from '#elements/text-input.js';
import type { TextButton, TextLabel } from '#elements/text.js';
import type { UIAspectRatioConstraint } from '#modifiers/aspect-ratio.js';
import type { UICorner } from '#modifiers/corner.js';
import type { UIGradient } from '#modifiers/gradient.js';
import type { UIListLayout } from '#modifiers/list-layout.js';
import type { UIPadding } from '#modifiers/padding.js';
import type { UIScale } from '#modifiers/scale.js';
import type { UIShadow } from '#modifiers/shadow.js';
import type { UIStroke } from '#modifiers/stroke.js';
import type { UITextStroke } from '#modifiers/text-stroke.js';

type InstanceTypes = {
  Frame: Frame;
  ImageButton: ImageButton;
  ImageLabel: ImageLabel;
  Link: Link;
  ScreenGui: ScreenGui;
  ScrollingFrame: ScrollingFrame;
  TextArea: TextArea;
  TextInput: TextInput;
  TextButton: TextButton;
  TextLabel: TextLabel;
  UIAspectRatioConstraint: UIAspectRatioConstraint;
  UICorner: UICorner;
  UIGradient: UIGradient;
  UIListLayout: UIListLayout;
  UIPadding: UIPadding;
  UIScale: UIScale;
  UIShadow: UIShadow;
  UIStroke: UIStroke;
  UITextStroke: UITextStroke;
};

/** Concrete built-in class names supported by hierarchy type guards. */
export type InstanceClassName = keyof InstanceTypes;

/** The concrete API associated with a built-in class name. */
export type InstanceOf<ClassName extends InstanceClassName> = InstanceTypes[ClassName];
