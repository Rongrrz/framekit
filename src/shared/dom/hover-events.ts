import { guiEventKeys } from '../runtime/gui-events';
import { addCleanup } from '../runtime/node-lifecycle';
import type { GuiElement } from '../runtime/render';
import { emitNodeEvent } from '../runtime/signal';

/** Connects the hover events shared by every DOM-backed GUI node. */
export function connectHoverEvents(node: GuiElement, element: HTMLElement): void {
  const listenerController = new AbortController();
  const listenerOptions = { signal: listenerController.signal };

  element.addEventListener(
    'mouseenter',
    (event) => emitNodeEvent(node, guiEventKeys.mouseEnter, event),
    listenerOptions,
  );
  element.addEventListener(
    'mouseleave',
    (event) => emitNodeEvent(node, guiEventKeys.mouseLeave, event),
    listenerOptions,
  );

  addCleanup(node, () => listenerController.abort());
}
