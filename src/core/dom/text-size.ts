import type { Instance, InstanceProperties } from '../node/instance.js';
import { setStyle } from './styles.js';
import type { TextStyleProperties } from './text-style.js';

type ObserverState = {
  observer: ResizeObserver;
  observerConstructor: typeof ResizeObserver;
  renders: Map<Element, () => void>;
};

const observerStatesByConstructor = new Map<typeof ResizeObserver, ObserverState>();
const textMeasureContexts = new WeakMap<Document, CanvasRenderingContext2D | null>();

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
    const estimatedSize = estimateUnwrappedTextSize(
      properties,
      availableWidth,
      availableHeight,
      element.ownerDocument,
    );
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
  let observerState: ObserverState | undefined;
  const setEnabled = (enabled: boolean): void => {
    if (!enabled) {
      if (!observerState) return;
      observerState.observer.unobserve(element);
      observerState.renders.delete(element);
      if (observerState.renders.size === 0) {
        observerState.observer.disconnect();
        observerStatesByConstructor.delete(observerState.observerConstructor);
      }
      observerState = undefined;
      return;
    }
    const ResizeObserverConstructor =
      element.ownerDocument.defaultView?.ResizeObserver ?? globalThis.ResizeObserver;
    if (observerState || typeof ResizeObserverConstructor !== 'function') return;
    observerState = observerStatesByConstructor.get(ResizeObserverConstructor);
    if (!observerState) {
      const renders = new Map<Element, () => void>();
      observerState = {
        renders,
        observerConstructor: ResizeObserverConstructor,
        observer: new ResizeObserverConstructor((entries) =>
          renderScaledTextEntries(entries, renders),
        ),
      };
      observerStatesByConstructor.set(ResizeObserverConstructor, observerState);
    }
    observerState.renders.set(element, render);
    observerState.observer.observe(element);
  };

  setEnabled(owner.TextScaled);
  owner.onPropertyChanged('TextScaled', setEnabled);
  owner.onDestroy(() => setEnabled(false));
}

function renderScaledTextEntries(
  entries: readonly ResizeObserverEntry[],
  renders: ReadonlyMap<Element, () => void>,
): void {
  if (entries.length === 0) {
    for (const render of renders.values()) render();
    return;
  }
  for (const entry of entries) {
    renders.get(entry.target)?.();
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
  ownerDocument: Document,
): number | undefined {
  let textMeasureContext = textMeasureContexts.get(ownerDocument);
  if (textMeasureContext === undefined) {
    textMeasureContext = ownerDocument.createElement('canvas').getContext('2d');
    textMeasureContexts.set(ownerDocument, textMeasureContext);
  }
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
