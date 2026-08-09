import { assertNodeActive, cleanup, node, type GuiNode, type NodeProps } from '../core/node';

export type ScreenGuiProps = NodeProps & {
  Enabled: boolean;
  DisplayOrder: number;
};

export type ScreenGuiNode = GuiNode<ScreenGuiProps>;

const mountTargets = new WeakMap<ScreenGuiNode, HTMLElement>();

export function screenGuiNode(initial: Partial<ScreenGuiProps> = {}): ScreenGuiNode {
  const element = document.createElement('div');
  element.dataset.framekit = 'ScreenGui';
  Object.assign(element.style, {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  });

  const gui = node(
    { Name: 'ScreenGui', Enabled: true, DisplayOrder: 0, ...initial },
    element,
    (props) => {
      element.style.display = props.Enabled ? '' : 'none';
      element.style.zIndex = String(props.DisplayOrder);
    },
  );
  cleanup(gui, () => mountTargets.delete(gui));
  return gui;
}

/** Mounts a screen GUI into an element or the first element matching a selector. */
export function mount(gui: ScreenGuiNode, target: string | HTMLElement): void {
  assertNodeActive(gui);
  const element = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!element) throw new Error(`Unable to mount ScreenGui: target "${target}" was not found.`);
  if (mountTargets.get(gui) === element) return;
  unmount(gui);
  mountTargets.set(gui, element);
  element.append(gui.element);
}

/** Removes a screen GUI from the DOM without destroying its node tree. */
export function unmount(gui: ScreenGuiNode): void {
  assertNodeActive(gui);
  gui.element.remove();
  mountTargets.delete(gui);
}

/** Reports whether a screen GUI is currently mounted through FrameKit. */
export function isMounted(gui: ScreenGuiNode): boolean {
  assertNodeActive(gui);
  return mountTargets.has(gui);
}
