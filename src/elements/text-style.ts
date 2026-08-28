import {
  assertAllowedValue,
  assertBoolean,
  assertNonNegativeFinite,
  assertString,
} from '../runtime/validation';
import { color3FromRGB, color3ToCss, type Color3 } from '../values/color3';

export type TextXAlignment = 'Left' | 'Center' | 'Right';
export type TextYAlignment = 'Top' | 'Center' | 'Bottom';

export type TextStyleProperties = {
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

export const horizontalFlexAlignment = {
  Left: 'flex-start',
  Center: 'center',
  Right: 'flex-end',
} as const;

export const verticalFlexAlignment = {
  Top: 'flex-start',
  Center: 'center',
  Bottom: 'flex-end',
} as const;

const horizontalAlignments: readonly TextXAlignment[] = ['Left', 'Center', 'Right'];
const verticalAlignments: readonly TextYAlignment[] = ['Top', 'Center', 'Bottom'];

export function createDefaultTextStyleProperties(): TextStyleProperties {
  return {
    Text: '',
    TextColor3: color3FromRGB(0, 0, 0),
    TextTransparency: 0,
    TextSize: 14,
    TextWrapped: false,
    TextXAlignment: 'Center',
    TextYAlignment: 'Center',
    FontFamily: 'system-ui, sans-serif',
    FontWeight: 'normal',
  };
}

export function renderTextStyle(
  element: HTMLElement,
  properties: Readonly<TextStyleProperties>,
): void {
  assertAllowedValue(properties.TextXAlignment, horizontalAlignments, 'TextXAlignment');
  assertAllowedValue(properties.TextYAlignment, verticalAlignments, 'TextYAlignment');
  assertString(properties.Text, 'Text');
  assertNonNegativeFinite(properties.TextSize, 'TextSize');
  assertBoolean(properties.TextWrapped, 'TextWrapped');
  assertString(properties.FontFamily, 'FontFamily');
  if (typeof properties.FontWeight !== 'string') {
    assertNonNegativeFinite(properties.FontWeight, 'FontWeight');
  }
  element.style.color = color3ToCss(properties.TextColor3, properties.TextTransparency);
  element.style.fontSize = `${properties.TextSize}px`;
  element.style.whiteSpace = properties.TextWrapped ? 'pre-wrap' : 'pre';
  element.style.textAlign = properties.TextXAlignment.toLowerCase();
  element.style.fontFamily = properties.FontFamily;
  element.style.fontWeight = String(properties.FontWeight);
}
