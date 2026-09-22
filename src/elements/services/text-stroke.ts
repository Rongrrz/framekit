import { installFrameKitStyles } from '../../dom/stylesheet.js';
import {
  horizontalFlexAlignment,
  verticalFlexAlignment,
  type TextStyleProperties,
} from './text-style.js';

export const textStrokeColorProperty = '--framekit-text-stroke-color';
export const textStrokeContentProperty = '--framekit-text-stroke-content';
export const textStrokeWidthProperty = '--framekit-text-stroke-width';

const textStrokeAlignProperty = '--framekit-text-stroke-align';
const textStrokeJustifyProperty = '--framekit-text-stroke-justify';

/** Prepares one text host to render an optional outline without another DOM node. */
export function initializeTextStrokeHost(host: HTMLElement): void {
  installFrameKitStyles({ ownerDocument: host.ownerDocument });
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
