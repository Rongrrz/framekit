export const textGradientFillProperty = '--framekit-text-gradient-fill';
export const textGradientImageProperty = '--framekit-text-gradient-image';

/** Prepares rendered text to consume an optional gradient from its FrameKit host. */
export function initializeTextGradient(text: HTMLElement): void {
  text.style.backgroundImage = `var(${textGradientImageProperty}, none)`;
  text.style.backgroundClip = 'text';
  text.style.webkitBackgroundClip = 'text';
  text.style.webkitTextFillColor = `var(${textGradientFillProperty}, currentcolor)`;
}

/** Restores ordinary text paint before attached modifiers are rendered. */
export function resetTextGradientHost(host: HTMLElement): void {
  host.style.setProperty(textGradientFillProperty, 'currentcolor');
  host.style.setProperty(textGradientImageProperty, 'none');
}
