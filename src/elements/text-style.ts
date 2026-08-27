import { color3, color3ToCss, type Color3 } from '../values/color3';

export type TextXAlignment = 'Left' | 'Center' | 'Right';
export type TextYAlignment = 'Top' | 'Center' | 'Bottom';

export type TextStyleProps = {
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

export const horizontalAlignment = {
  Left: 'flex-start',
  Center: 'center',
  Right: 'flex-end',
} as const;

export const verticalAlignment = {
  Top: 'flex-start',
  Center: 'center',
  Bottom: 'flex-end',
} as const;

export function defaultTextStyleProps(): TextStyleProps {
  return {
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

export function renderTextStyle(element: HTMLElement, props: Readonly<TextStyleProps>): void {
  element.style.color = color3ToCss(props.TextColor3, props.TextTransparency);
  element.style.fontSize = `${Math.max(0, props.TextSize)}px`;
  element.style.whiteSpace = props.TextWrapped ? 'pre-wrap' : 'pre';
  element.style.textAlign = props.TextXAlignment.toLowerCase();
  element.style.fontFamily = props.FontFamily;
  element.style.fontWeight = String(props.FontWeight);
}
