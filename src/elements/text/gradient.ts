export const textGradientFillProperty = '--framekit-text-gradient-fill';

export const textGradientImageProperty = '--framekit-text-gradient-image';

/** Prepares rendered text to consume an optional gradient from its FrameKit host. */
export function initializeTextGradient(host: HTMLElement, text: HTMLElement): void {
  setStyle(host, textGradientFillProperty, 'currentcolor');
  setStyle(host, textGradientImageProperty, 'none');
  text.style.backgroundImage = `var(${textGradientImageProperty}, none)`;
  text.style.backgroundClip = 'text';
  // Keep the prefixed CSS fallback without using its deprecated CSSStyleDeclaration alias.
  text.style.setProperty('-webkit-background-clip', 'text');
  text.style.webkitTextFillColor = `var(${textGradientFillProperty}, currentcolor)`;
}

import { setStyle } from '#internal/dom/styles.js';
