import {
  bindVirtualList,
  createObservableValue,
  createScreenGui,
  createScrollingFrame,
  createTextInput,
  createTextLabel,
  udim2,
  udim2FromOffset,
} from 'framekit';

/** A complete search-to-results path: native editing, filtering 100k records, and bounded views. */
export const createSearchApplication = (): Readonly<{ destroy(): void }> => {
  const gui = createScreenGui();
  const items = Array.from({ length: 100_000 }, (_, id) => ({
    id,
    label: `Record ${id} ${id % 2 ? 'amber' : 'blue'}`,
  }));
  const source = createObservableValue<readonly (typeof items)[number][]>(items);
  const selection = createObservableValue<string | number | undefined>(undefined);
  const search = createTextInput({
    AccessibleLabel: 'Filter records',
    Size: udim2(1, -32, 0, 40),
    Position: udim2FromOffset(16, 16),
  });
  search.Parent = gui;
  const viewport = createScrollingFrame({
    Size: udim2(1, -32, 1, -120),
    Position: udim2FromOffset(16, 72),
  });
  viewport.unsafeElement.setAttribute('aria-label', 'Search results');
  viewport.Parent = gui;
  const status = createTextLabel({ Size: udim2(1, -32, 0, 32), Position: udim2(0, 16, 1, -40) });
  status.unsafeElement.setAttribute('role', 'status');
  status.Parent = gui;
  bindVirtualList(viewport, source, {
    itemHeight: 32,
    selection,
    key: (item) => item.id,
    create: () => createTextLabel({ TextXAlignment: 'Left' }),
    update: (row, item) => {
      row.Text = item.label;
    },
  });
  search.onTextChanged((query) => {
    const normalized = query.toLowerCase();
    source.set(items.filter((item) => item.label.toLowerCase().includes(normalized)));
    status.Text = `${source.get().length} results`;
  });
  status.Text = `${items.length} results`;
  gui.mount('#root');
  return { destroy: (): void => gui.destroy() };
};
