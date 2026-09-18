import type { Frame } from '../elements/frame';
import type { ImageButton, ImageLabel } from '../elements/image';
import type { Link } from '../elements/link';
import type { ScreenGui } from '../elements/screen-gui';
import type { ScrollingFrame } from '../elements/scrolling-frame';
import type { TextButton, TextLabel } from '../elements/text';
import type { TextArea } from '../elements/text-area';
import type { TextInput } from '../elements/text-input';
import type { UIAspectRatioConstraint } from '../modifiers/aspect-ratio';
import type { UICorner } from '../modifiers/corner';
import type { UIGradient } from '../modifiers/gradient';
import type { UIListLayout } from '../modifiers/list-layout';
import type { UIPadding } from '../modifiers/padding';
import type { UIScale } from '../modifiers/scale';
import type { UIShadow } from '../modifiers/shadow';
import type { UIStroke } from '../modifiers/stroke';
import type { UITextStroke } from '../modifiers/text-stroke';

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
