import type { GuiObject } from '#elements/gui-object.js';
import { setStyleLayer } from '#internal/dom/styles.js';
import { assertNonNegativeFinite } from '#internal/validation.js';
import type { Unsubscribe } from '#state/signal.js';

/** Placement inside the nearest scrolling ancestor; the normal layout slot is retained. */
export type StickyOptions = Readonly<{
  /** Distance in pixels from the scrolling viewport's top edge. */
  inset?: number;
}>;

const bindings = new WeakMap<GuiObject, Unsubscribe>();

/** Keeps a GUI object in view while preserving its preferred Position and parent layout. */
export function bindSticky(node: GuiObject, options: StickyOptions = {}): Unsubscribe {
  const inset = options.inset ?? 0;
  assertNonNegativeFinite(inset, 'Sticky inset');

  if (node.isDestroyed()) {
    throw new Error('Sticky target has been destroyed.');
  }

  bindings.get(node)?.();
  const element = node.unsafeElement;

  const dispose = (): void => {
    if (bindings.get(node) !== dispose) {
      return;
    }

    bindings.delete(node);
    setStyleLayer(element, 'placement', {});
    unregisterDestroy();
  };

  const unregisterDestroy = node.onDestroy(dispose);
  bindings.set(node, dispose);
  setStyleLayer(element, 'placement', { position: 'sticky', top: `${inset}px` });

  return dispose;
}
