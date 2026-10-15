import {
  bindDialog,
  bindMenu,
  bindPopover,
  bindTooltip,
  bindVirtualList,
  createFrame,
  createObservableValue,
  createScreenGui,
  createScrollingFrame,
  createTextButton,
  createTextLabel,
  createUIListLayout,
  createTween,
  udim2FromOffset,
  type GuiElement,
} from 'framekit';
import { bindRuntimeInspector } from 'framekit/devtools';

type Probe = Readonly<{ label: string; ref: WeakRef<object> }>;
const probes: Probe[] = [];
const sample = (label: string, value: object): void => {
  probes.push({ label, ref: new WeakRef(value) });
};
const sampleNode = (label: string, node: GuiElement): void => {
  sample(`${label}:handle`, node);
  sample(`${label}:element`, node.unsafeElement);
};
const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

/** Exercises ownership with active observers, animation, top-layer controls, and an open inspector. */
export const runLifetime = async (record: boolean): Promise<void> => {
  const gui = createScreenGui();
  gui.mount('#root');
  const remember = (label: string, node: GuiElement): void => {
    if (record) {
      sampleNode(label, node);
    }
  };
  remember('root', gui);
  const column = createFrame();
  column.Parent = gui;
  createUIListLayout().Parent = column;
  for (let index = 0; index < 100; index += 1) {
    const row = createTextButton({ Text: `Row ${index}` });
    row.onMouseEnter(() => undefined);
    row.onPropertyChanged('Rotation', () => undefined);
    row.Parent = column;
    remember('subscribed-row', row);
  }
  const trigger = createTextButton({ Text: 'Overlay trigger' });
  trigger.Parent = gui;
  const panel = createFrame();
  createTextButton({ Text: 'Popover command' }).Parent = panel;
  bindPopover(trigger, panel);
  trigger.onDestroy(() => panel.destroy());
  bindTooltip(trigger, 'Tooltip content');
  trigger.unsafeElement.click();
  trigger.unsafeElement.dispatchEvent(new MouseEvent('mouseenter'));
  remember('popover', panel);
  const menuTrigger = createTextButton({ Text: 'Menu' });
  menuTrigger.Parent = gui;
  const menu = createFrame();
  menu.Parent = gui;
  const command = createTextButton({ Text: 'Command' });
  command.Parent = menu;
  bindMenu(menuTrigger, menu, [command]).open();
  remember('menu', menu);
  const modal = createFrame({ TagName: 'dialog' });
  modal.Parent = gui;
  bindDialog(modal).open(menuTrigger);
  remember('dialog', modal);
  const viewport = createScrollingFrame({ Size: udim2FromOffset(240, 160) });
  viewport.Parent = gui;
  const source = createObservableValue(Array.from({ length: 10_000 }, (_, index) => index));
  const selection = createObservableValue<string | number | undefined>(0);
  bindVirtualList(viewport, source, {
    itemHeight: { estimate: 32 },
    selection,
    key: (id) => id,
    create: (id) => {
      const row = createTextLabel({
        Text: `Item ${id}`,
        Size: udim2FromOffset(240, 32 + (id % 3) * 12),
      });
      remember('virtual-row', row);
      return row;
    },
  });
  remember('viewport', viewport);
  const motion = createTween(trigger, { Duration: 10 }, { Rotation: 90 });
  motion.play();
  const inspector = bindRuntimeInspector(gui, { shortcut: { key: 'F8' } });
  inspector.open();
  if (record) {
    for (const element of document.querySelectorAll('[data-fk-debug-panel], [role="tooltip"]')) {
      sample('inspector-or-tooltip', element);
    }
  }
  await nextFrame();
  await nextFrame();
  gui.destroy();
  // Keep the sources alive while notifying them after disposal to detect lingering subscriptions.
  source.set([50, 60]);
  selection.set(60);
  await nextFrame();
  await nextFrame();
  if (
    document.querySelector('#root')!.childElementCount ||
    document.querySelector('dialog[open], :popover-open, [data-fk-debug-panel], [role="tooltip"]')
  ) {
    throw new Error('A destroyed lifetime left owned DOM or top-layer content.');
  }
};

/** Detached documents exercise document-scoped native templates without retaining their realm. */
export const sampleDocuments = (): void => {
  for (let index = 0; index < 10; index += 1) {
    const ownerDocument = document.implementation.createHTMLDocument(`Temporary ${index}`);
    for (const TagName of [
      'div',
      'section',
      'article',
      'nav',
      'aside',
      'header',
      'footer',
      'figure',
      'main',
      'dialog',
    ] as const) {
      const frame = createFrame({ TagName }, { ownerDocument });
      frame.destroy();
    }
    sample('temporary-document', ownerDocument);
  }
};

/** Read only after external GC in a separate browser task so WeakRef reads do not keep targets alive. */
export const lifetimeSummary = (): Readonly<{
  groups: Record<string, { sampled: number; retained: number }>;
  sampled: number;
  retained: number;
}> => {
  const groups: Record<string, { sampled: number; retained: number }> = {};
  for (const { label, ref } of probes) {
    const group = (groups[label] ??= { sampled: 0, retained: 0 });
    group.sampled += 1;
    group.retained += ref.deref() === undefined ? 0 : 1;
  }
  return {
    groups,
    sampled: probes.length,
    retained: Object.values(groups).reduce((sum, group) => sum + group.retained, 0),
  };
};
