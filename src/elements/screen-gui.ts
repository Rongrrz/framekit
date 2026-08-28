import { addCleanup, assertNodeActive } from '../runtime/node';
import { createGuiNode, type GuiNode } from '../runtime/render';
import { mergeProps, type NodeProps } from '../runtime/state';
import { assertBoolean, assertInteger } from '../runtime/validation';
import { connectHoverEvents } from './hover-events';

export type ScreenGuiProps = NodeProps & {
  Enabled: boolean;
  DisplayOrder: number;
};

export type ScreenGuiNode = GuiNode<ScreenGuiProps>;

const mountTargets = new WeakMap<ScreenGuiNode, HTMLElement>();

export function createScreenGui(initial: Partial<ScreenGuiProps> = {}): ScreenGuiNode {
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
    mergeProps({ Name: 'ScreenGui', Enabled: true, DisplayOrder: 0 }, initial),
    element,
    (props) => {
      assertBoolean(props.Enabled, 'Enabled');
      assertInteger(props.DisplayOrder, 'DisplayOrder');
      element.style.display = props.Enabled ? '' : 'none';
      element.style.zIndex = String(props.DisplayOrder);
    },
  );
  connectHoverEvents(gui, element);
  addCleanup(gui, () => mountTargets.delete(gui));
  return gui;
}

/** Mounts a full-viewport ScreenGui beneath the supplied DOM owner. */
export function mount(gui: ScreenGuiNode, target: string | HTMLElement): void {
  assertNodeActive(gui);
  const element = resolveMountTarget(target);
  if (mountTargets.get(gui) === element && gui.element.parentElement === element) return;
  unmount(gui);
  mountTargets.set(gui, element);
  element.append(gui.element);
}

export function unmount(gui: ScreenGuiNode): void {
  assertNodeActive(gui);
  gui.element.remove();
  mountTargets.delete(gui);
}

export function isMounted(gui: ScreenGuiNode): boolean {
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
