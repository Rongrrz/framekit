import type { Instance } from '../shared/runtime/node';
import { assertNonNegativeFinite } from '../shared/runtime/validation';

export type ResponsiveLayoutOptions = Readonly<{
  breakpoint: number;
  mobile: () => void;
  desktop: () => void;
}>;

type ResponsiveLayout = 'mobile' | 'desktop';

/** Applies a viewport layout now and again whenever its breakpoint is crossed. */
export function bindResponsiveLayout(owner: Instance, options: ResponsiveLayoutOptions): void {
  assertNonNegativeFinite(options.breakpoint, 'Breakpoint');

  if (typeof options.mobile !== 'function') {
    throw new TypeError('Mobile layout must be a function.');
  }

  if (typeof options.desktop !== 'function') {
    throw new TypeError('Desktop layout must be a function.');
  }

  let currentLayout: ResponsiveLayout | undefined;

  const updateLayout = (): void => {
    const nextLayout = window.innerWidth < options.breakpoint ? 'mobile' : 'desktop';

    if (nextLayout === currentLayout) return;

    currentLayout = nextLayout;
    options[nextLayout]();
  };

  updateLayout();

  const listenerController = new AbortController();
  window.addEventListener('resize', updateLayout, {
    signal: listenerController.signal,
  });
  owner.onDestroy(() => listenerController.abort());
}
