import { cleanup, node, props as nodeProps, type GuiNode, type NodeProps } from '../core/node';

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

  const gui = node<ScreenGuiProps>(
    { Name: 'ScreenGui', Enabled: true, DisplayOrder: 0, ...initial },
    element,
    (props) => {
      element.style.display = props.Enabled ? '' : 'none';
      element.style.zIndex = String(props.DisplayOrder);
    },
  ) as ScreenGuiNode;
  cleanup(gui, () => mountTargets.delete(gui));
  return gui;
}

export function mount(gui: ScreenGuiNode, target: string | HTMLElement): void {
  nodeProps(gui);
  const element = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!element) throw new Error(`Unable to mount ScreenGui: target "${target}" was not found.`);
  if (mountTargets.get(gui) === element) return;
  unmount(gui);
  mountTargets.set(gui, element);
  element.append(gui.element);
}

export function unmount(gui: ScreenGuiNode): void {
  gui.element.remove();
  mountTargets.delete(gui);
}

export function isMounted(gui: ScreenGuiNode): boolean {
  return mountTargets.has(gui);
}
