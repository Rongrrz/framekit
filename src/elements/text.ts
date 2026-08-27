import type { GuiNode, Render } from '../runtime/render';
import { configureButton, type ButtonNode, type ButtonProps } from './button';
import { createFrameNode, defaultFrameProps, type FrameProps } from './frame';
import {
  defaultTextStyleProps,
  horizontalAlignment,
  renderTextStyle,
  verticalAlignment,
  type TextStyleProps,
} from './text-style';

export type { TextXAlignment, TextYAlignment } from './text-style';

export type TextLabelProps = FrameProps & TextStyleProps;

export type TextLabelNode = GuiNode<TextLabelProps>;
export type TextButtonProps = TextLabelProps & ButtonProps;
export type TextButtonNode = GuiNode<TextButtonProps> & ButtonNode;

export function createTextLabel(initial: Partial<TextLabelProps> = {}): TextLabelNode {
  return createTextNode('TextLabel', document.createElement('div'), defaultTextProps(), initial);
}

export function createTextButton(initial: Partial<TextButtonProps> = {}): TextButtonNode {
  const element = document.createElement('button');
  const node = createTextNode(
    'TextButton',
    element,
    { ...defaultTextProps(), Name: 'TextButton', Disabled: false },
    initial,
    (props) => {
      element.disabled = props.Disabled;
      element.style.cursor = props.Disabled ? 'not-allowed' : 'pointer';
    },
  ) as TextButtonNode;
  configureButton(node, element);
  return node;
}

function defaultTextProps(): TextLabelProps {
  return {
    ...defaultFrameProps(),
    Name: 'TextLabel',
    ...defaultTextStyleProps(),
  };
}

function createTextNode<Props extends TextLabelProps>(
  kind: string,
  element: HTMLElement,
  defaults: Props,
  initial: Partial<Props>,
  renderExtra?: Render<Props>,
): GuiNode<Props> {
  const text = document.createElement('span');
  text.dataset.framekitText = '';
  Object.assign(text.style, {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    pointerEvents: 'none',
    lineHeight: '1.2',
  });
  element.prepend(text);

  return createFrameNode(kind, element, defaults, initial, (props, changed) => {
    text.textContent = props.Text;
    renderTextStyle(text, props);
    text.style.justifyContent = horizontalAlignment[props.TextXAlignment];
    text.style.alignItems = verticalAlignment[props.TextYAlignment];
    renderExtra?.(props, changed);
  });
}
