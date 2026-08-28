import { guiEventKeys } from '../../shared/runtime/gui-events';
import { addCleanup } from '../../shared/runtime/node-lifecycle';
import type { GuiNode } from '../../shared/runtime/render';
import { emitNodeEvent } from '../../shared/runtime/signal';

/** Connects the hover events shared by every DOM-backed GUI node. */
export function connectHoverEvents(node: GuiNode, element: HTMLElement): void {
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
