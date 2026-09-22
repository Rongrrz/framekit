import { createRealmAbortController } from '#dom/environment.js';
import { emitNodeEvent } from '#runtime/node/events.js';
import { guiEventKeys } from '#runtime/node/gui-events.js';
import type { GuiElement } from '#runtime/node/gui-node.js';
import * as lifecycle from '#runtime/services/lifecycle.js';

/** Connects the hover events shared by every DOM-backed GUI node. */
export function connectHoverEvents(node: GuiElement, element: HTMLElement): void {
  const listenerController = createRealmAbortController(element);
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

  lifecycle.onDestroy(node, () => listenerController.abort());
}
