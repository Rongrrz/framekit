import type { ScreenGui } from '#elements/screen-gui.js';
import type { Instance } from '#internal/runtime/node/instance.js';
import { isGuiNode } from '#internal/runtime/node/registry.js';
import { udim2FromOffset } from '#values/udim.js';

import { colors } from './view.js';
import type { InspectorWorkspace } from './workspace.js';

/** Owns native picking listeners and the highlight; cancellation reports whether picking was active. */
export const bindInspectorPicker = (
  root: Instance,
  gui: ScreenGui,
  workspace: Pick<InspectorWorkspace, 'pick' | 'footer' | 'highlight' | 'highlightLabel'>,
  select: (node: Instance) => void,
): (() => boolean) => {
  const { pick, footer, highlight, highlightLabel } = workspace;
  const document = gui.unsafeElement.ownerDocument;
  const window = document.defaultView!;
  let picking = false;
  const stopPicking = (): void => {
    picking = false;
    pick.BackgroundColor3 = colors.canvas;
    pick.unsafeElement.setAttribute('aria-pressed', 'false');
    highlight.Visible = false;
    footer.Text = '● Live · Read only    Drag title · Resize edges';
  };
  pick.unsafeElement.setAttribute('aria-pressed', 'false');
  pick.onClick(() => {
    if (picking) {
      stopPicking();
      return;
    }
    picking = true;
    pick.BackgroundColor3 = colors.selected;
    pick.unsafeElement.setAttribute('aria-pressed', 'true');
    footer.Text = 'Click an element in your app to inspect it · Esc cancels';
  });
  const pickTarget = (target: EventTarget | null): Instance | undefined => {
    if (!(target instanceof window.Element) || gui.unsafeElement.contains(target)) {
      return;
    }
    const elements = new Map(
      [root, ...root.getDescendants()].filter(isGuiNode).map((node) => [node.unsafeElement, node]),
    );
    for (let element: Element | null = target; element; element = element.parentElement) {
      const node = elements.get(element as HTMLElement);
      if (node) {
        return node;
      }
    }
    return undefined;
  };
  const movePicker = (event: PointerEvent): void => {
    if (!picking) {
      return;
    }
    const node = pickTarget(event.target);
    if (!node || !isGuiNode(node)) {
      highlight.Visible = false;
      return;
    }
    const rect = node.unsafeElement.getBoundingClientRect();
    highlight.setProperties({
      Visible: true,
      Position: udim2FromOffset(rect.left, rect.top),
      Size: udim2FromOffset(rect.width, rect.height),
    });
    highlightLabel.Text = ` ${node.Name} · ${node.ClassName}`;
    highlightLabel.Position = udim2FromOffset(-2, rect.top < 28 ? 0 : -26);
  };
  const blockPickerPointer = (event: PointerEvent): void => {
    if (picking && pickTarget(event.target)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const clickPicker = (event: MouseEvent): void => {
    if (!picking) {
      return;
    }
    const node = pickTarget(event.target);
    if (!node) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    stopPicking();
    select(node);
  };
  document.addEventListener('pointerdown', blockPickerPointer, true);
  document.addEventListener('pointerup', blockPickerPointer, true);
  document.addEventListener('pointermove', movePicker, true);
  document.addEventListener('click', clickPicker, true);
  gui.onDestroy(() => {
    document.removeEventListener('pointerdown', blockPickerPointer, true);
    document.removeEventListener('pointerup', blockPickerPointer, true);
    document.removeEventListener('pointermove', movePicker, true);
    document.removeEventListener('click', clickPicker, true);
  });
  return (): boolean => {
    if (!picking) {
      return false;
    }
    stopPicking();
    return true;
  };
};
