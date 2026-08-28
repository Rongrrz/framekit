import { buttonEventMethods, type GuiEventMethodTable } from '../runtime/gui-events';
import { type GuiNode, type PropertyRenderer } from '../runtime/render';
import { assertBoolean } from '../runtime/validation';
import { initializeButtonElement, type ButtonNode, type ButtonProps } from './button';
import { createDefaultFrameProps, createFrameBasedNode, type FrameProps } from './frame';
import {
  createDefaultTextStyleProps,
  horizontalFlexAlignment,
  renderTextStyle,
  verticalFlexAlignment,
  type TextStyleProps,
} from './text-style';

export type { TextXAlignment, TextYAlignment } from './text-style';

export type TextLabelProps = FrameProps & TextStyleProps;

export type TextLabelNode = GuiNode<TextLabelProps>;
export type TextButtonProps = TextLabelProps & ButtonProps;
export type TextButtonNode = GuiNode<TextButtonProps> & ButtonNode;

export function createTextLabel(initial: Partial<TextLabelProps> = {}): TextLabelNode {
  return createTextNode(
    'TextLabel',
    document.createElement('div'),
    createDefaultTextProps(),
    initial,
  );
}

export function createTextButton(initial: Partial<TextButtonProps> = {}): TextButtonNode {
  const element = document.createElement('button');
  const node = createTextNode(
    'TextButton',
    element,
    { ...createDefaultTextProps(), Name: 'TextButton', Disabled: false },
    initial,
    (props) => {
      assertBoolean(props.Disabled, 'Disabled');
      element.disabled = props.Disabled;
      element.style.cursor = props.Disabled ? 'not-allowed' : 'pointer';
    },
    buttonEventMethods,
  ) as TextButtonNode;
  initializeButtonElement(node, element);
  return node;
}

function createDefaultTextProps(): TextLabelProps {
  return {
    ...createDefaultFrameProps(),
    Name: 'TextLabel',
    ...createDefaultTextStyleProps(),
  };
}

function createTextNode<Props extends TextLabelProps>(
  nodeType: string,
  element: HTMLElement,
  defaultProps: Props,
  initial: Partial<Props>,
  renderAdditionalProperties?: PropertyRenderer<Props>,
  eventMethods?: GuiEventMethodTable,
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

  return createFrameBasedNode(
    nodeType,
    element,
    defaultProps,
    initial,
    (props, changed) => {
      text.textContent = props.Text;
      renderTextStyle(text, props);
      text.style.justifyContent = horizontalFlexAlignment[props.TextXAlignment];
      text.style.alignItems = verticalFlexAlignment[props.TextYAlignment];
      renderAdditionalProperties?.(props, changed);
    },
    eventMethods,
  );
}
