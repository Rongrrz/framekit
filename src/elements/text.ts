import type { GuiNode, Render } from '../runtime/render';
import { color3, color3ToCss, type Color3 } from '../values/color3';
import { configureButton, type ButtonNode, type ButtonProps } from './button';
import { createFrameNode, defaultFrameProps, type FrameProps } from './frame';

export type TextXAlignment = 'Left' | 'Center' | 'Right';
export type TextYAlignment = 'Top' | 'Center' | 'Bottom';

export type TextLabelProps = FrameProps & {
  Text: string;
  TextColor3: Color3;
  TextTransparency: number;
  TextSize: number;
  TextWrapped: boolean;
  TextXAlignment: TextXAlignment;
  TextYAlignment: TextYAlignment;
  FontFamily: string;
  FontWeight: string | number;
};

export type TextLabelNode = GuiNode<TextLabelProps>;
export type TextButtonProps = TextLabelProps & ButtonProps;
export type TextButtonNode = GuiNode<TextButtonProps> & ButtonNode;

const horizontalAlignment = { Left: 'flex-start', Center: 'center', Right: 'flex-end' } as const;
const verticalAlignment = { Top: 'flex-start', Center: 'center', Bottom: 'flex-end' } as const;

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
    Text: '',
    TextColor3: color3(0, 0, 0),
    TextTransparency: 0,
    TextSize: 14,
    TextWrapped: false,
    TextXAlignment: 'Center',
    TextYAlignment: 'Center',
    FontFamily: 'system-ui, sans-serif',
    FontWeight: 'normal',
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
    text.style.color = color3ToCss(props.TextColor3, props.TextTransparency);
    text.style.fontSize = `${Math.max(0, props.TextSize)}px`;
    text.style.whiteSpace = props.TextWrapped ? 'pre-wrap' : 'pre';
    text.style.justifyContent = horizontalAlignment[props.TextXAlignment];
    text.style.alignItems = verticalAlignment[props.TextYAlignment];
    text.style.textAlign = props.TextXAlignment.toLowerCase();
    text.style.fontFamily = props.FontFamily;
    text.style.fontWeight = String(props.FontWeight);
    renderExtra?.(props, changed);
  });
}
