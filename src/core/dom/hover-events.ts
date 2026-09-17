import { DestroyService } from '../destroy-service';
import { emitNodeEvent } from '../node/events';
import { guiEventKeys } from '../node/gui-events';
import type { GuiElement } from '../node/gui-node';
import { createRealmAbortController } from './environment';

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

  DestroyService.onDestroy(node, () => listenerController.abort());
}
