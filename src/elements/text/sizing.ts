import { setStyle } from '#internal/dom/styles.js';
import type { Instance, InstanceProperties } from '#internal/runtime/node/instance.js';

import type { TextStyleProperties } from './style.js';

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
  // Ordinary text has an explicit size. Reading geometry here would force layout after
  // every text edit, even when no measurement is needed.
  if (!properties.TextScaled || properties.Text.length === 0) {
    setStyle(element, 'font-size', `${properties.TextSize}px`);

    return;
  }

  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  const horizontalPadding =
    (parseFloat(style?.paddingLeft ?? '') || 0) + (parseFloat(style?.paddingRight ?? '') || 0);
  const verticalPadding =
    (parseFloat(style?.paddingTop ?? '') || 0) + (parseFloat(style?.paddingBottom ?? '') || 0);
  const availableWidth = element.clientWidth - horizontalPadding;
  const availableHeight = element.clientHeight - verticalPadding;

  if (availableWidth <= 0 || availableHeight <= 0) {
    setStyle(element, 'font-size', `${properties.TextSize}px`);

    return;
  }

  const maximumSize = Math.max(1, Math.floor(availableHeight));
  const fits = measureTextFit(element, availableWidth, horizontalPadding > 0);

  if (!properties.TextWrapped) {
    const estimatedSize = estimateUnwrappedTextSize(
      properties,
      availableWidth,
      availableHeight,
      element.ownerDocument,
    );

    if (estimatedSize !== undefined) {
      renderEstimatedTextSize(element, Math.min(maximumSize, estimatedSize), maximumSize, fits);

      return;
    }
  }

  fitTextSize(element, 1, maximumSize, 1, fits);
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
      if (!observerState) {
        return;
      }

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

    if (observerState || typeof ResizeObserverConstructor !== 'function') {
      return;
    }

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
    for (const render of renders.values()) {
      render();
    }

    return;
  }

  for (const entry of entries) {
    renders.get(entry.target)?.();
  }
}

function measureTextFit(
  element: HTMLElement,
  availableWidth: number,
  padded: boolean,
): () => boolean {
  // Flex text can paint into its own padding without increasing scrollWidth.
  // Native input controls have no child text; their scroll metrics include the editor content.
  const range = padded && element.hasChildNodes() ? element.ownerDocument.createRange() : undefined;
  range?.selectNodeContents(element);

  return () =>
    element.scrollWidth <= element.clientWidth + 1 &&
    element.scrollHeight <= element.clientHeight + 1 &&
    (!range || range.getBoundingClientRect().width <= availableWidth + 1);
}

function renderEstimatedTextSize(
  element: HTMLElement,
  estimatedSize: number,
  maximumSize: number,
  fits: () => boolean,
): void {
  let fittedSize = Math.max(1, estimatedSize);
  setStyle(element, 'font-size', `${fittedSize}px`);

  if (!fits()) {
    fitTextSize(element, 1, fittedSize - 1, 1, fits);

    return;
  }

  if (fittedSize < maximumSize) {
    setStyle(element, 'font-size', `${fittedSize + 1}px`);

    if (!fits()) {
      setStyle(element, 'font-size', `${fittedSize}px`);

      return;
    }

    fittedSize += 1;
  }

  // Estimates can diverge from DOM metrics (including browser font-size clamping).
  // Never refine pixel by pixel: layout work must grow logarithmically with the bounds.
  fitTextSize(element, fittedSize + 1, maximumSize, fittedSize, fits);
}

function fitTextSize(
  element: HTMLElement,
  smallestCandidate: number,
  largestCandidate: number,
  fittedSize: number,
  fits: () => boolean,
): void {
  while (smallestCandidate <= largestCandidate) {
    const candidate = Math.floor((smallestCandidate + largestCandidate) / 2);
    setStyle(element, 'font-size', `${candidate}px`);

    if (fits()) {
      fittedSize = candidate;
      smallestCandidate = candidate + 1;
    } else {
      largestCandidate = candidate - 1;
    }
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

  if (!textMeasureContext) {
    return;
  }

  const measurementSize = 100;
  textMeasureContext.font = `${properties.FontWeight} ${measurementSize}px ${properties.FontFamily}`;

  const lines = properties.Text.split('\n');
  let widthLimit = availableHeight;

  for (const line of lines) {
    const widthAtOnePixel = textMeasureContext.measureText(line).width / measurementSize;
    const spacing = Math.max(0, line.length - 1) * properties.LetterSpacing;

    if (widthAtOnePixel > 0) {
      widthLimit = Math.min(widthLimit, (availableWidth + 1 - spacing) / widthAtOnePixel);
    }
  }

  const heightLimit = (availableHeight + 1) / (lines.length * properties.LineHeight);

  return Math.max(1, Math.floor(Math.min(widthLimit, heightLimit)));
}
