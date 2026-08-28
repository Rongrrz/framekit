import { guiEventMethods } from '../runtime/gui-events';
import { addCleanup, assertNodeActive } from '../runtime/node-lifecycle';
import { mergeProperties, type NodeProperties } from '../runtime/node-state';
import { createGuiNode, type GuiNode } from '../runtime/render';
import { assertBoolean, assertInteger } from '../runtime/validation';
import { connectHoverEvents } from './hover-events';

export type ScreenGuiProperties = NodeProperties & {
  Enabled: boolean;
  DisplayOrder: number;
};

export type ScreenGuiMethods = {
  mount(target: string | HTMLElement): void;
  unmount(): void;
  isMounted(): boolean;
};

export type ScreenGuiNode = GuiNode<ScreenGuiProperties> & ScreenGuiMethods;

const screenGuiMethods = Object.freeze({
  ...guiEventMethods,
  mount(this: ScreenGuiNode, target: string | HTMLElement): void {
    mountScreenGui(this, target);
  },
  unmount(this: ScreenGuiNode): void {
    unmountScreenGui(this);
  },
  isMounted(this: ScreenGuiNode): boolean {
    return isScreenGuiMounted(this);
  },
} satisfies typeof guiEventMethods & ScreenGuiMethods);

const mountTargets = new WeakMap<ScreenGuiNode, HTMLElement>();

export function createScreenGui(initial: Partial<ScreenGuiProperties> = {}): ScreenGuiNode {
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
    (properties) => {
      assertBoolean(properties.Enabled, 'Enabled');
      assertInteger(properties.DisplayOrder, 'DisplayOrder');
      element.style.display = properties.Enabled ? '' : 'none';
      element.style.zIndex = String(properties.DisplayOrder);
    },
    screenGuiMethods,
  ) as ScreenGuiNode;
  connectHoverEvents(gui, element);
  addCleanup(gui, () => mountTargets.delete(gui));
  return gui;
}

/** Mounts a full-viewport ScreenGui beneath the supplied DOM owner. */
function mountScreenGui(gui: ScreenGuiNode, target: string | HTMLElement): void {
  assertNodeActive(gui);
  const element = resolveMountTarget(target);
  if (mountTargets.get(gui) === element && gui.element.parentElement === element) return;
  unmountScreenGui(gui);
  mountTargets.set(gui, element);
  element.append(gui.element);
}

function unmountScreenGui(gui: ScreenGuiNode): void {
  assertNodeActive(gui);
  gui.element.remove();
  mountTargets.delete(gui);
}

function isScreenGuiMounted(gui: ScreenGuiNode): boolean {
  assertNodeActive(gui);
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
