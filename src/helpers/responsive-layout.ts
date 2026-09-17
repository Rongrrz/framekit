import type { GuiElement } from '../core';
import { createRealmAbortController } from '../core/dom/environment';
import { assertNonNegativeFinite } from '../core/internal-api';

export type ResponsiveLayoutOptions = Readonly<{
  breakpoint: number;
  mobile: () => void;
  desktop: () => void;
}>;

type ResponsiveLayout = 'mobile' | 'desktop';

/** Applies a viewport layout now and again whenever its breakpoint is crossed. */
export function bindResponsiveLayout(owner: GuiElement, options: ResponsiveLayoutOptions): void {
  if (owner.isDestroyed()) throw new Error('Responsive layout owner has been destroyed.');
  assertNonNegativeFinite(options.breakpoint, 'Breakpoint');

  if (typeof options.mobile !== 'function') {
    throw new TypeError('Mobile layout must be a function.');
  }

  if (typeof options.desktop !== 'function') {
    throw new TypeError('Desktop layout must be a function.');
  }

  let currentLayout: ResponsiveLayout | undefined;
  const ownerWindow = owner.unsafeElement.ownerDocument.defaultView;
  if (!ownerWindow) throw new Error('Responsive layout requires a document with a window.');

  const updateLayout = (): void => {
    const nextLayout = ownerWindow.innerWidth < options.breakpoint ? 'mobile' : 'desktop';

    if (nextLayout === currentLayout) return;

    currentLayout = nextLayout;
    options[nextLayout]();
  };

  updateLayout();
  if (owner.isDestroyed()) return;

  const listenerController = createRealmAbortController(owner.unsafeElement);
  ownerWindow.addEventListener('resize', updateLayout, {
    signal: listenerController.signal,
  });
  owner.onDestroy(() => listenerController.abort());
}
