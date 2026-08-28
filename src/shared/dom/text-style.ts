import { assertColor3, color3FromRGB, color3ToCss, type Color3 } from '../../core/values/color3';
import {
  assertAllowedValue,
  assertBoolean,
  assertNonNegativeFinite,
  assertString,
} from '../runtime/validation';

/** Horizontal alignment of text within its node. */
export type TextXAlignment = 'Left' | 'Center' | 'Right';

/** Vertical alignment of text within its node. */
export type TextYAlignment = 'Top' | 'Center' | 'Bottom';

/** Typography properties shared by text-capable nodes. */
export type TextStyleProperties = {
  /** Displayed text. */
  Text: string;
  /** Text color before transparency is applied. */
  TextColor3: Color3;
  /** Text transparency from 0 (opaque) to 1 (invisible). */
  TextTransparency: number;
  /** Font size in pixels. */
  TextSize: number;
  /** Whether text wraps within its bounds. */
  TextWrapped: boolean;
  /** Horizontal alignment within the node. */
  TextXAlignment: TextXAlignment;
  /** Vertical alignment within the node. */
  TextYAlignment: TextYAlignment;
  /** CSS font-family value. */
  FontFamily: string;
  /** CSS font-weight name or number. */
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
  element.style.color = color3ToCss(properties.TextColor3, properties.TextTransparency);
  element.style.fontSize = `${properties.TextSize}px`;
  element.style.whiteSpace = properties.TextWrapped ? 'pre-wrap' : 'pre';
  element.style.textAlign = properties.TextXAlignment.toLowerCase();
  element.style.fontFamily = properties.FontFamily;
  element.style.fontWeight = String(properties.FontWeight);
}

export function validateTextStyleProperties(properties: Readonly<TextStyleProperties>): void {
  assertAllowedValue(properties.TextXAlignment, horizontalAlignments, 'TextXAlignment');
  assertAllowedValue(properties.TextYAlignment, verticalAlignments, 'TextYAlignment');
  assertString(properties.Text, 'Text');
  assertColor3(properties.TextColor3, 'TextColor3');
  assertNonNegativeFinite(properties.TextTransparency, 'TextTransparency');
  assertNonNegativeFinite(properties.TextSize, 'TextSize');
  assertBoolean(properties.TextWrapped, 'TextWrapped');
  assertString(properties.FontFamily, 'FontFamily');
  if (typeof properties.FontWeight !== 'string') {
    assertNonNegativeFinite(properties.FontWeight, 'FontWeight');
  }
}
