import { connectHoverEvents } from '../../shared/dom/hover-events';
import { guiEventMethods } from '../../shared/runtime/gui-events';
import type { InstanceProperties } from '../../shared/runtime/node';
import { addCleanup } from '../../shared/runtime/node-lifecycle';
import { getActiveNodeState, mergeProperties } from '../../shared/runtime/node-state';
import { createGuiNode, setStyle, type GuiElement } from '../../shared/runtime/render';
import { assertBoolean, assertInteger } from '../../shared/runtime/validation';

/** Properties controlling a full-viewport GUI root. */
export type ScreenGuiProperties = InstanceProperties & {
  /** Whether this GUI is rendered while mounted. */
  Enabled: boolean;
  /** Stacking order relative to other mounted ScreenGuis. */
  DisplayOrder: number;
};

/** Mounting operations unique to ScreenGui roots. */
export type ScreenGuiMethods = {
  /** Mounts this GUI beneath a DOM element or selector. */
  mount(target: string | HTMLElement): void;
  /** Removes this GUI from the DOM without destroying it. */
  unmount(): void;
  /** Reports whether this GUI is mounted to its current target. */
  isMounted(): boolean;
};

/** A mountable full-viewport hierarchy root. */
export type ScreenGui = GuiElement<ScreenGuiProperties> & ScreenGuiMethods;

const screenGuiMethods = Object.freeze({
  ...guiEventMethods,
  mount(this: ScreenGui, target: string | HTMLElement): void {
    mountScreenGui(this, target);
  },
  unmount(this: ScreenGui): void {
    unmountScreenGui(this);
  },
  isMounted(this: ScreenGui): boolean {
    return isScreenGuiMounted(this);
  },
} satisfies typeof guiEventMethods & ScreenGuiMethods);

const mountTargets = new WeakMap<ScreenGui, HTMLElement>();

/** Creates an unmounted full-viewport GUI root. */
export function createScreenGui(initial: Partial<ScreenGuiProperties> = {}): ScreenGui {
  const element = document.createElement('div');
  element.dataset.framekit = 'ScreenGui';
  Object.assign(element.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
    overscrollBehavior: 'none',
  });

  const gui = createGuiNode(
    'ScreenGui',
    mergeProperties({ Name: 'ScreenGui', Enabled: true, DisplayOrder: 0 }, initial),
    element,
    (properties, changed) => {
      if (changed.has('Enabled')) setStyle(element, 'display', properties.Enabled ? '' : 'none');
      if (changed.has('DisplayOrder')) {
        setStyle(element, 'z-index', String(properties.DisplayOrder));
      }
    },
    validateScreenGuiProperties,
    screenGuiMethods,
    { canHaveParent: false },
  ) as ScreenGui;

  connectHoverEvents(gui, element);
  addCleanup(gui, () => mountTargets.delete(gui));
  return gui;
}

function validateScreenGuiProperties(properties: Readonly<ScreenGuiProperties>): void {
  assertBoolean(properties.Enabled, 'Enabled');
  assertInteger(properties.DisplayOrder, 'DisplayOrder');
}

/** Mounts a full-viewport ScreenGui beneath the supplied DOM owner. */
function mountScreenGui(gui: ScreenGui, target: string | HTMLElement): void {
  getActiveNodeState(gui);
  const element = resolveMountTarget(target);
  if (mountTargets.get(gui) === element && gui.element.parentElement === element) return;

  unmountScreenGui(gui);
  mountTargets.set(gui, element);
  element.append(gui.element);
}

function unmountScreenGui(gui: ScreenGui): void {
  getActiveNodeState(gui);
  gui.element.remove();
  mountTargets.delete(gui);
}

function isScreenGuiMounted(gui: ScreenGui): boolean {
  getActiveNodeState(gui);
  const target = mountTargets.get(gui);
  if (!target || gui.element.parentElement !== target) {
    mountTargets.delete(gui);
    return false;
  }
  return true;
}

function resolveMountTarget(target: string | HTMLElement): HTMLElement {
  if (typeof target !== 'string') return target;
  let element: HTMLElement | null;
  try {
    element = document.querySelector<HTMLElement>(target);
  } catch {
    throw new TypeError(`Unable to mount ScreenGui: "${target}" is not a valid selector.`);
  }

  if (!element) throw new Error(`Unable to mount ScreenGui: target "${target}" was not found.`);
  return element;
}
