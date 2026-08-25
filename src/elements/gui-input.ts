import { addCleanup } from '../runtime/node';
import type { GuiNode } from '../runtime/render';
import { emitNodeEvent } from '../runtime/signal';

export type GuiEvent = 'MouseEnter' | 'MouseLeave';

/** Adds hover input shared by all DOM-backed GUI nodes. */
export function configureGuiInput(node: GuiNode, element: HTMLElement): void {
  const controller = new AbortController();
  const listenerOptions = { signal: controller.signal };
  element.addEventListener(
    'mouseenter',
    (event) => emitNodeEvent(node, 'MouseEnter', event),
    listenerOptions,
  );
  element.addEventListener(
    'mouseleave',
    (event) => emitNodeEvent(node, 'MouseLeave', event),
    listenerOptions,
  );
  addCleanup(node, () => controller.abort());
}
