import type { Instance, InstanceProperties } from '../runtime/node';
import { setStyle } from './styles';
import type { TextStyleProperties } from './text-style';

const textScaleRenders = new Map<HTMLElement, () => void>();
let textScaleObserver: ResizeObserver | undefined;
let textMeasureContext: CanvasRenderingContext2D | null | undefined;

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
