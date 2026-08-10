import type { GuiNode, Render } from '../core/node/variants/gui';
import { color3, color3ToCss, type Color3 } from '../primitives/color3';
import { frameDefaults, frameNode, type FrameProps } from './frame';

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

const horizontalAlignment = { Left: 'flex-start', Center: 'center', Right: 'flex-end' } as const;
const verticalAlignment = { Top: 'flex-start', Center: 'center', Bottom: 'flex-end' } as const;

export function textLabelDefaults(): TextLabelProps {
  return {
    ...frameDefaults(),
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

export function textNode<Props extends TextLabelProps>(
  kind: string,
  element: HTMLElement,
  defaults: Props,
  initial: Partial<Props>,
  renderExtra?: Render<Props>,
): GuiNode<Props> {
  const textElement = document.createElement('span');
  textElement.dataset.framekitText = '';
  Object.assign(textElement.style, {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    pointerEvents: 'none',
    lineHeight: '1.2',
  });
  element.prepend(textElement);

  return frameNode(kind, element, defaults, initial, (props, changed) => {
    textElement.textContent = props.Text;
    textElement.style.color = color3ToCss(props.TextColor3, props.TextTransparency);
    textElement.style.fontSize = `${Math.max(0, props.TextSize)}px`;
    textElement.style.whiteSpace = props.TextWrapped ? 'normal' : 'nowrap';
    textElement.style.justifyContent = horizontalAlignment[props.TextXAlignment];
    textElement.style.alignItems = verticalAlignment[props.TextYAlignment];
    textElement.style.textAlign = props.TextXAlignment.toLowerCase();
    textElement.style.fontFamily = props.FontFamily;
    textElement.style.fontWeight = String(props.FontWeight);
    renderExtra?.(props, changed);
  });
}
