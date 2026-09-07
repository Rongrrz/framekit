import { guiEventKeys } from '../runtime/gui-events';
import type { GuiElement } from '../runtime/gui-node';
import { emitNodeEvent } from '../runtime/node-events';
import { onDestroy } from '../runtime/node-lifecycle';

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

  onDestroy(node, () => listenerController.abort());
}
