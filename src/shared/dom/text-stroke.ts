import {
  horizontalFlexAlignment,
  verticalFlexAlignment,
  type TextStyleProperties,
} from './text-style';

export const textStrokeColorProperty = '--framekit-text-stroke-color';
export const textStrokeContentProperty = '--framekit-text-stroke-content';
export const textStrokeWidthProperty = '--framekit-text-stroke-width';

const textStrokeAlignProperty = '--framekit-text-stroke-align';
const textStrokeJustifyProperty = '--framekit-text-stroke-justify';
const documentsWithTextStrokeStyles = new WeakSet<Document>();

/** Prepares one text host to render an optional outline without another DOM node. */
export function initializeTextStrokeHost(host: HTMLElement): void {
  ensureTextStrokeStyles(host.ownerDocument);
  host.dataset.framekitTextStrokeHost = '';
}

/** Resets inherited stroke values before attached modifiers are rendered. */
export function resetTextStrokeHost(host: HTMLElement): void {
  host.style.setProperty(textStrokeColorProperty, 'transparent');
  host.style.setProperty(textStrokeContentProperty, 'none');
  host.style.setProperty(textStrokeWidthProperty, '0px');
}

/** Keeps the generated outline on the same font geometry as the visible text. */
export function syncTextStrokeHost(
  host: HTMLElement,
  properties: Readonly<TextStyleProperties>,
  renderedFontSize: string,
): void {
  host.dataset.framekitTextContent = properties.Text;
  host.style.fontFamily = properties.FontFamily;
  host.style.fontWeight = String(properties.FontWeight);
  host.style.fontSize = renderedFontSize;
  host.style.whiteSpace = properties.TextWrapped ? 'pre-wrap' : 'pre';
  host.style.textAlign = properties.TextXAlignment.toLowerCase();
  host.style.setProperty(
    textStrokeJustifyProperty,
    horizontalFlexAlignment[properties.TextXAlignment],
  );
  host.style.setProperty(textStrokeAlignProperty, verticalFlexAlignment[properties.TextYAlignment]);
}

function ensureTextStrokeStyles(ownerDocument: Document): void {
  if (documentsWithTextStrokeStyles.has(ownerDocument)) return;
  const style = ownerDocument.createElement('style');
  style.dataset.framekitTextStrokeStyles = '';
  style.textContent = `
    [data-framekit-text-stroke-host]::before {
      content: var(${textStrokeContentProperty}, none) / "";
      position: absolute;
      inset: 0;
      display: flex;
      align-items: var(${textStrokeAlignProperty});
      justify-content: var(${textStrokeJustifyProperty});
      pointer-events: none;
      user-select: none;
      color: transparent;
      white-space: inherit;
      text-align: inherit;
      font: inherit;
      line-height: 1.2;
      -webkit-text-fill-color: transparent;
      -webkit-text-stroke-color: var(${textStrokeColorProperty}, transparent);
      -webkit-text-stroke-width: var(${textStrokeWidthProperty}, 0px);
      paint-order: stroke fill;
    }
  `;
  ownerDocument.head.append(style);
  documentsWithTextStrokeStyles.add(ownerDocument);
}
