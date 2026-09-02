import { assertColor3, color3FromRGB, color3ToCss, type Color3 } from '../../core/values/color3';
import type { Instance, InstanceProperties } from '../runtime/node';
import { setStyle } from '../runtime/render';
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

const textScaleRenders = new Map<HTMLElement, () => void>();
let textScaleObserver: ResizeObserver | undefined;
let textMeasureContext: CanvasRenderingContext2D | null | undefined;

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
  changed?: ReadonlySet<PropertyKey>,
): void {
  if (!changed || changed.has('TextColor3') || changed.has('TextTransparency')) {
    setStyle(element, 'color', color3ToCss(properties.TextColor3, properties.TextTransparency));
  }
  if (!changed || changed.has('TextWrapped')) {
    setStyle(element, 'white-space', properties.TextWrapped ? 'pre-wrap' : 'pre');
  }
  if (!changed || changed.has('TextXAlignment')) {
    setStyle(element, 'text-align', properties.TextXAlignment.toLowerCase());
  }
  if (!changed || changed.has('FontFamily')) {
    setStyle(element, 'font-family', properties.FontFamily);
  }
  if (!changed || changed.has('FontWeight')) {
    setStyle(element, 'font-weight', String(properties.FontWeight));
  }
  if (
    !changed ||
    changed.has('Text') ||
    changed.has('TextSize') ||
    changed.has('TextScaled') ||
    changed.has('TextWrapped') ||
    changed.has('FontFamily') ||
    changed.has('FontWeight')
  ) {
    renderTextSize(element, properties);
  }
}

/** Recalculates only the font size, which lets resize observers avoid repainting other styles. */
export function renderTextSize(
  element: HTMLElement,
  properties: Readonly<TextStyleProperties>,
): void {
  const availableWidth = element.clientWidth;
  const availableHeight = element.clientHeight;
  if (
    !properties.TextScaled ||
    properties.Text.length === 0 ||
    availableWidth <= 0 ||
    availableHeight <= 0
  ) {
    setStyle(element, 'font-size', `${properties.TextSize}px`);
    return;
  }

  const maximumSize = Math.max(1, Math.floor(availableHeight));
  if (!properties.TextWrapped) {
    const estimatedSize = estimateUnwrappedTextSize(properties, availableWidth, availableHeight);
    if (estimatedSize !== undefined) {
      renderEstimatedTextSize(element, Math.min(maximumSize, estimatedSize), maximumSize);
      return;
    }
  }
  let smallestCandidate = 1;
  let largestCandidate = maximumSize;
  let fittedSize = 1;

  while (smallestCandidate <= largestCandidate) {
    const candidate = Math.floor((smallestCandidate + largestCandidate) / 2);
    setStyle(element, 'font-size', `${candidate}px`);

    if (textFits(element)) {
      fittedSize = candidate;
      smallestCandidate = candidate + 1;
    } else {
      largestCandidate = candidate - 1;
    }
  }

  setStyle(element, 'font-size', `${fittedSize}px`);
}

/** Recalculates scaled text when browser layout changes without adding work to ordinary text. */
export function bindTextScaleResize<Properties extends InstanceProperties & TextStyleProperties>(
  owner: Instance<Properties>,
  element: HTMLElement,
  render: () => void,
): void {
  let observing = false;
  const setEnabled = (enabled: boolean): void => {
    if (!enabled) {
      if (!observing) return;
      observing = false;
      textScaleObserver?.unobserve(element);
      textScaleRenders.delete(element);
      if (textScaleRenders.size === 0) {
        textScaleObserver?.disconnect();
        textScaleObserver = undefined;
      }
      return;
    }
    if (observing || typeof ResizeObserver !== 'function') return;
    observing = true;
    textScaleRenders.set(element, render);
    textScaleObserver ??= new ResizeObserver(renderScaledTextEntries);
    textScaleObserver.observe(element);
  };

  setEnabled(owner.TextScaled);
  owner.onPropertyChanged('TextScaled', setEnabled);
  owner.onDestroy(() => setEnabled(false));
}

function renderScaledTextEntries(entries: readonly ResizeObserverEntry[]): void {
  if (entries.length === 0) {
    for (const render of textScaleRenders.values()) render();
    return;
  }
  for (const entry of entries) {
    if (!(entry.target instanceof HTMLElement)) continue;
    textScaleRenders.get(entry.target)?.();
  }
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

function renderEstimatedTextSize(
  element: HTMLElement,
  estimatedSize: number,
  maximumSize: number,
): void {
  let fittedSize = Math.max(1, estimatedSize);
  setStyle(element, 'font-size', `${fittedSize}px`);

  while (fittedSize > 1 && !textFits(element)) {
    fittedSize -= 1;
    setStyle(element, 'font-size', `${fittedSize}px`);
  }
  while (fittedSize < maximumSize) {
    setStyle(element, 'font-size', `${fittedSize + 1}px`);
    if (!textFits(element)) break;
    fittedSize += 1;
  }
  setStyle(element, 'font-size', `${fittedSize}px`);
}

function estimateUnwrappedTextSize(
  properties: Readonly<TextStyleProperties>,
  availableWidth: number,
  availableHeight: number,
): number | undefined {
  textMeasureContext ??= document.createElement('canvas').getContext('2d');
  if (!textMeasureContext) return;

  const measurementSize = 100;
  textMeasureContext.font = `${properties.FontWeight} ${measurementSize}px ${properties.FontFamily}`;
  const lines = properties.Text.split('\n');
  let widestLine = 0;
  for (const line of lines) {
    widestLine = Math.max(widestLine, textMeasureContext.measureText(line).width);
  }
  const widthAtOnePixel = widestLine / measurementSize;
  const widthLimit = widthAtOnePixel > 0 ? (availableWidth + 1) / widthAtOnePixel : availableHeight;
  const heightLimit = (availableHeight + 1) / (lines.length * 1.2);
  return Math.max(1, Math.floor(Math.min(widthLimit, heightLimit)));
}
