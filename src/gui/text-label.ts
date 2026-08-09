import type { GuiNode, Render } from '../core/node';
import { Color3 } from '../primitives/Color3';
import { frameDefaults, frameNode, type FrameProps } from './frame-node';

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

export function textLabelDefaults(): TextLabelProps {
  return {
    ...frameDefaults(),
    Name: 'TextLabel',
    Text: '',
    TextColor3: Color3.fromRGB(0, 0, 0),
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
    const horizontal = { Left: 'flex-start', Center: 'center', Right: 'flex-end' } as const;
    const vertical = { Top: 'flex-start', Center: 'center', Bottom: 'flex-end' } as const;
    textElement.textContent = props.Text;
    textElement.style.color = props.TextColor3.toCSS(props.TextTransparency);
    textElement.style.fontSize = `${Math.max(0, props.TextSize)}px`;
    textElement.style.whiteSpace = props.TextWrapped ? 'normal' : 'nowrap';
    textElement.style.justifyContent = horizontal[props.TextXAlignment];
    textElement.style.alignItems = vertical[props.TextYAlignment];
    textElement.style.textAlign = props.TextXAlignment.toLowerCase();
    textElement.style.fontFamily = props.FontFamily;
    textElement.style.fontWeight = String(props.FontWeight);
    renderExtra?.(props, changed);
  });
}
