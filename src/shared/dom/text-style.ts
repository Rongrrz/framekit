import { assertColor3, color3FromRGB, color3ToCss, type Color3 } from '../../core/values/color3';
import type { Instance, InstanceProperties } from '../runtime/node';
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
  /** Whether text uses the largest whole-pixel size that fits its bounds. */
  TextScaled: boolean;
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
    TextScaled: false,
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
  element.style.whiteSpace = properties.TextWrapped ? 'pre-wrap' : 'pre';
  element.style.textAlign = properties.TextXAlignment.toLowerCase();
  element.style.fontFamily = properties.FontFamily;
  element.style.fontWeight = String(properties.FontWeight);
  renderTextSize(element, properties);
}

/** Recalculates only the font size, which lets resize observers avoid repainting other styles. */
export function renderTextSize(
  element: HTMLElement,
  properties: Readonly<TextStyleProperties>,
): void {
  if (
    !properties.TextScaled ||
    properties.Text.length === 0 ||
    element.clientWidth <= 0 ||
    element.clientHeight <= 0
  ) {
    element.style.fontSize = `${properties.TextSize}px`;
    return;
  }

  const maximumSize = Math.max(1, Math.floor(element.clientHeight));
  let smallestCandidate = 1;
  let largestCandidate = maximumSize;
  let fittedSize = 1;

  while (smallestCandidate <= largestCandidate) {
    const candidate = Math.floor((smallestCandidate + largestCandidate) / 2);
    element.style.fontSize = `${candidate}px`;

    if (textFits(element)) {
      fittedSize = candidate;
      smallestCandidate = candidate + 1;
    } else {
      largestCandidate = candidate - 1;
    }
  }

  element.style.fontSize = `${fittedSize}px`;
}

/** Recalculates scaled text when browser layout changes without adding work to ordinary text. */
export function bindTextScaleResize<Properties extends InstanceProperties & TextStyleProperties>(
  owner: Instance<Properties>,
  element: HTMLElement,
  render: () => void,
): void {
  const state: { observer: ResizeObserver | undefined } = { observer: undefined };
  const setEnabled = (enabled: boolean): void => {
    if (!enabled) {
      state.observer?.disconnect();
      state.observer = undefined;
      return;
    }
    if (state.observer || typeof ResizeObserver !== 'function') return;
    state.observer = new ResizeObserver(render);
    state.observer.observe(element);
  };

  setEnabled(owner.TextScaled);
  owner.onPropertyChanged('TextScaled', setEnabled);
  owner.onDestroy(() => setEnabled(false));
}

export function validateTextStyleProperties(properties: Readonly<TextStyleProperties>): void {
  assertAllowedValue(properties.TextXAlignment, horizontalAlignments, 'TextXAlignment');
  assertAllowedValue(properties.TextYAlignment, verticalAlignments, 'TextYAlignment');
  assertString(properties.Text, 'Text');
  assertColor3(properties.TextColor3, 'TextColor3');
  assertNonNegativeFinite(properties.TextTransparency, 'TextTransparency');
  assertNonNegativeFinite(properties.TextSize, 'TextSize');
  assertBoolean(properties.TextScaled, 'TextScaled');
  assertBoolean(properties.TextWrapped, 'TextWrapped');
  assertString(properties.FontFamily, 'FontFamily');
  if (typeof properties.FontWeight !== 'string') {
    assertNonNegativeFinite(properties.FontWeight, 'FontWeight');
  }
}

function textFits(element: HTMLElement): boolean {
  return (
    element.scrollWidth <= element.clientWidth + 1 &&
    element.scrollHeight <= element.clientHeight + 1
  );
}
