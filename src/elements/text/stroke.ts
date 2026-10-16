import { setStyle } from '#internal/dom/styles.js';
import { installFrameKitStyles } from '#internal/dom/stylesheet.js';

import {
  horizontalFlexAlignment,
  verticalFlexAlignment,
  type TextStyleProperties,
} from './style.js';

export const textStrokeColorProperty = '--framekit-text-stroke-color';

export const textStrokeContentProperty = '--framekit-text-stroke-content';

export const textStrokeWidthProperty = '--framekit-text-stroke-width';

const textStrokeAlignProperty = '--framekit-text-stroke-align';

const textStrokeJustifyProperty = '--framekit-text-stroke-justify';

/** Prepares one text host to render an optional outline without another DOM node. */
export function initializeTextStrokeHost(host: HTMLElement): void {
  installFrameKitStyles({ ownerDocument: host.ownerDocument });
  host.dataset.framekitTextStrokeHost = '';
  setStyle(host, textStrokeColorProperty, 'transparent');
  setStyle(host, textStrokeContentProperty, 'none');
  setStyle(host, textStrokeWidthProperty, '0px');
}

/** Keeps the generated outline on the same font geometry as the visible text. */
export function syncTextStrokeHost(
  host: HTMLElement,
  properties: Readonly<TextStyleProperties>,
  renderedFontSize: string,
): void {
  host.dataset.framekitTextContent = properties.Text;
  setStyle(host, 'font-family', properties.FontFamily);
  setStyle(host, 'font-weight', String(properties.FontWeight));
  setStyle(host, 'font-size', renderedFontSize);
  setStyle(host, 'white-space', properties.TextWrapped ? 'pre-wrap' : 'pre');
  setStyle(host, 'text-align', properties.TextXAlignment.toLowerCase());
  setStyle(host, textStrokeJustifyProperty, horizontalFlexAlignment[properties.TextXAlignment]);
  setStyle(host, textStrokeAlignProperty, verticalFlexAlignment[properties.TextYAlignment]);
}
