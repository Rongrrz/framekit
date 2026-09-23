import type { GuiObject } from '#elements/gui-object.js';
import { createScreenGui } from '#elements/screen-gui.js';
import type { GuiElement } from '#internal/runtime/node/gui-node.js';
import { udim2FromOffset } from '#values/udim.js';
import { vector2 } from '#values/vector2.js';

import type { PanelOptions } from './types.js';

const interactiveContent =
  'button, input, select, textarea, a[href], [tabindex], [contenteditable]:not([contenteditable="false"])';
let nextPanelId = 0;

export type FloatingPanelPortal = Readonly<{
  target: HTMLElement;
  panel: HTMLElement;
  content: GuiObject;
  document: Document;
  window: Window & typeof globalThis;
  layerElement: HTMLElement;
  isVisible(): boolean;
  show(): void;
  hide(): void;
  setExpanded(expanded: boolean): void;
  dispose(): void;
}>;

/** Owns the floating layer, accessibility relationship, and caller-content restoration. */
export const createFloatingPanelPortal = (
  target: GuiElement,
  content: GuiObject,
  options: PanelOptions,
): FloatingPanelPortal => {
  const element = target.unsafeElement;
  const document = element.ownerDocument;
  const window = document.defaultView!;
  const panel = content.unsafeElement;
  const popover = options.kind === 'popover';
  const followCursor = options.kind === 'tooltip' && options.followCursor;
  if (content.isDestroyed()) {
    throw new Error('Floating panel content has been destroyed.');
  }
  if (content === target || content.Parent || panel.isConnected) {
    throw new Error('Floating panel content must be detached.');
  }
  if (panel.ownerDocument !== document) {
    throw new TypeError('Floating panel content must belong to the target document.');
  }
  if (!popover && (panel.matches(interactiveContent) || panel.querySelector(interactiveContent))) {
    throw new TypeError('Tooltip content must be non-interactive.');
  }
  if (panel.id && document.getElementById(panel.id)) {
    throw new Error('Floating panel content must have a unique id.');
  }

  const original = {
    position: content.Position,
    anchor: content.AnchorPoint,
    visible: content.Visible,
    id: panel.getAttribute('id'),
    role: panel.getAttribute('role'),
    pointerEvents: panel.style.pointerEvents,
    expanded: element.getAttribute('aria-expanded'),
  };
  const id = panel.id || createPanelId(document, options.kind);
  const relation = popover ? 'aria-controls' : 'aria-describedby';
  const relationAlreadyPresent = (element.getAttribute(relation) ?? '').split(/\s+/).includes(id);
  const layer = createScreenGui(
    { Name: popover ? 'PopoverLayer' : 'TooltipLayer', Enabled: false, DisplayOrder: 2147483647 },
    { ownerDocument: document },
  );
  const layerElement = layer.unsafeElement;
  Object.assign(layerElement.style, {
    pointerEvents: 'none',
    margin: '0',
    padding: '0',
    border: '0',
    background: 'transparent',
  });
  const supportsPopover = typeof layerElement.showPopover === 'function';
  if (supportsPopover) {
    layerElement.setAttribute('popover', 'manual');
  }
  content.setProperties({
    Position: udim2FromOffset(0, 0),
    AnchorPoint: vector2(0, 0),
    Visible: true,
  });
  panel.id = id;
  panel.setAttribute('role', popover ? (original.role ?? 'group') : 'tooltip');
  panel.style.pointerEvents = followCursor ? 'none' : 'auto';
  content.Parent = layer;
  // Modal dialogs make outside content inert even when it enters the top layer.
  layer.mount(element.closest('dialog') ?? document.body ?? document.documentElement);
  if (!relationAlreadyPresent) {
    element.setAttribute(relation, [element.getAttribute(relation), id].filter(Boolean).join(' '));
  }
  if (popover) {
    element.setAttribute('aria-expanded', 'false');
  }

  const show = (): void => {
    if (layer.Enabled) {
      return;
    }
    layer.Enabled = true;
    if (supportsPopover) {
      layerElement.showPopover();
    }
  };

  const hide = (): void => {
    if (!layer.Enabled) {
      return;
    }
    if (supportsPopover) {
      layerElement.hidePopover();
    }
    layer.Enabled = false;
  };

  const setExpanded = (expanded: boolean): void => {
    if (popover) {
      element.setAttribute('aria-expanded', String(expanded));
    }
  };

  const dispose = (): void => {
    if (!relationAlreadyPresent) {
      const remaining = (element.getAttribute(relation) ?? '')
        .split(/\s+/)
        .filter((token) => token && token !== id);
      if (remaining.length) {
        element.setAttribute(relation, remaining.join(' '));
      } else {
        element.removeAttribute(relation);
      }
    }
    if (popover) {
      restoreAttribute(element, 'aria-expanded', original.expanded);
    }
    if (!content.isDestroyed()) {
      content.Parent = undefined;
      if (options.kind === 'tooltip' && options.destroyContent) {
        content.destroy();
      } else {
        content.setProperties({
          Position: original.position,
          AnchorPoint: original.anchor,
          Visible: original.visible,
        });
        restoreAttribute(panel, 'id', original.id);
        restoreAttribute(panel, 'role', original.role);
        panel.style.pointerEvents = original.pointerEvents;
      }
    }
    layer.destroy();
  };

  return Object.freeze({
    target: element,
    panel,
    content,
    document,
    window,
    layerElement,
    isVisible: () => layer.Enabled,
    show,
    hide,
    setExpanded,
    dispose,
  });
};

const createPanelId = (document: Document, kind: 'tooltip' | 'popover'): string => {
  const id = `framekit-${kind}-${++nextPanelId}`;
  return document.getElementById(id) ? createPanelId(document, kind) : id;
};

const restoreAttribute = (element: HTMLElement, name: string, value: string | null): void => {
  if (value === null) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, value);
  }
};
