import type { GuiObject } from '#elements/gui-object.js';
import type { GuiElement } from '#internal/runtime/node/gui-node.js';
import type { Unsubscribe } from '#state/signal.js';

import { createFloatingPanelController } from './controller.js';
import { connectFloatingPanelInteractions } from './interactions.js';
import { createFloatingPanelPortal } from './portal.js';
import type { PanelOptions } from './types.js';
import { validatePanelOptions } from './validation.js';

/** Owns the complete binding lifetime while focused modules handle each panel responsibility. */
export const bindFloatingPanel = (
  target: GuiElement,
  content: GuiObject,
  options: PanelOptions,
): Unsubscribe => {
  validatePanelOptions(target, options);
  const portal = createFloatingPanelPortal(target, content, options);
  const controller = createFloatingPanelController(portal, options);
  const disconnectInteractions = connectFloatingPanelInteractions(portal, controller, options);
  let disposed = false;

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    controller.dispose();
    disconnectInteractions();
    unregisterTargetDestroy();
    unregisterContentDestroy();
    portal.dispose();
  };

  const unregisterTargetDestroy = target.onDestroy(dispose);
  const unregisterContentDestroy = content.onDestroy(dispose);
  controller.start();
  return dispose;
};
