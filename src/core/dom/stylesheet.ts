import { assertString } from '../internal/validation.js';
import { resolveOwnerDocument, type DomOptions } from './environment.js';

/** Installation options for FrameKit's shared pseudo-element and interaction styles. */
export type StyleOptions = DomOptions & Readonly<{ nonce?: string }>;

/** Installs shared styles once. Supply a CSP nonce before creating nodes in a protected document. */
export function installFrameKitStyles(options: StyleOptions = {}): void {
  const ownerDocument = resolveOwnerDocument(options);
  if (options.nonce !== undefined) {
    assertString(options.nonce, 'Style nonce');
  }
  const existing = ownerDocument.querySelector<HTMLStyleElement>('style[data-framekit-styles]');
  if (existing) {
    if (options.nonce !== undefined && existing.nonce !== options.nonce) {
      throw new Error('Install FrameKit styles with the required nonce before creating nodes.');
    }
    return;
  }
  const style = ownerDocument.createElement('style');
  style.dataset.framekitStyles = '';
  if (options.nonce !== undefined) {
    style.nonce = options.nonce;
  }
  style.textContent = sharedStyles;
  ownerDocument.head.append(style);
}

const sharedStyles = `
  [data-framekit-button][data-framekit-auto-button-color] {
    transition: filter 140ms ease;
  }
  [data-framekit-button][data-framekit-auto-button-color]:not(:disabled):hover {
    filter: brightness(1.06);
  }
  [data-framekit-button][data-framekit-auto-button-color]:not(:disabled):active {
    filter: brightness(0.92);
  }
  @media (prefers-reduced-motion: reduce) {
    [data-framekit-button][data-framekit-auto-button-color] {
      transition-duration: 0.001ms;
    }
  }
  [data-framekit-text-control]::placeholder {
    color: var(--framekit-placeholder-color);
    opacity: 1;
  }
  [data-framekit-text-stroke-host]::before {
    content: var(--framekit-text-stroke-content, none) / "";
    position: absolute;
    inset: 0;
    display: flex;
    align-items: var(--framekit-text-stroke-align);
    justify-content: var(--framekit-text-stroke-justify);
    pointer-events: none;
    user-select: none;
    color: transparent;
    white-space: inherit;
    text-align: inherit;
    font: inherit;
    line-height: 1.2;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke-color: var(--framekit-text-stroke-color, transparent);
    -webkit-text-stroke-width: var(--framekit-text-stroke-width, 0px);
    paint-order: stroke fill;
  }
  [data-framekit="ScrollingFrame"] {
    scrollbar-color: var(--framekit-scrollbar-color) transparent;
    scrollbar-gutter: stable;
  }
  [data-framekit="ScrollingFrame"]::-webkit-scrollbar {
    width: var(--framekit-scrollbar-thickness);
    height: var(--framekit-scrollbar-thickness);
  }
  [data-framekit="ScrollingFrame"]::-webkit-scrollbar-track,
  [data-framekit="ScrollingFrame"]::-webkit-scrollbar-corner {
    background: transparent;
  }
  [data-framekit="ScrollingFrame"]::-webkit-scrollbar-thumb {
    min-height: 48px;
    border: 3px solid transparent;
    border-radius: 999px;
    background: var(--framekit-scrollbar-color);
    background-clip: padding-box;
  }
`;
