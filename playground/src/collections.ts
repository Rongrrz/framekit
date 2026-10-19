import {
  bindVirtualList,
  createObservableValue,
  createFrame,
  type Frame,
  createScrollingFrame,
  createTextLabel,
  createUIListLayout,
  udim,
  udim2,
  udim2FromOffset,
  watchOwnedValue,
} from 'framekit';

import { bindThemeColors, fonts, type ThemeValue } from './theme';
import { createButton, createText } from './ui';

/** Creates a collection view owned by the integrated examples page. */
export const createCollection = (theme: ThemeValue, measuredHeights: boolean): Frame => {
  const expanded = new Set<number>();
  const app = createFrame({
    Name: 'CollectionExample',
    Size: udim2(1, 0, 1, 0),
    BackgroundTransparency: 1,
  });

  const data = createObservableValue<readonly number[]>(
    Array.from({ length: 100_000 }, (_, index) => index),
  );

  const selection = createObservableValue<string | number | undefined>(0);

  createText(theme, {
    text: 'Virtual collection',
    size: udim2(1, -32, 0, 32),
    position: udim2FromOffset(16, 16),
    textSize: 24,
    weight: 800,
  }).Parent = app;

  const viewport = createScrollingFrame({
    Name: 'VirtualCollection',
    Size: udim2(1, -32, 1, -160),
    Position: udim2FromOffset(16, 112),
    BackgroundTransparency: 1,
  });

  viewport.unsafeElement.setAttribute('aria-label', 'Virtual collection');
  bindThemeColors(viewport, theme, (palette) => ({
    BackgroundColor3: palette.surface,
    ScrollBarImageColor3: palette.textMuted,
  }));

  viewport.Parent = app;

  const list = bindVirtualList(viewport, data, {
    itemHeight: measuredHeights ? { estimate: 64 } : 32,
    selection,
    key: (id) => id,

    create: () => {
      const row = createTextLabel({
        TextXAlignment: 'Left',
        TextSize: 14,
        FontFamily: fonts.mono,
        TextWrapped: measuredHeights,
        AutomaticSize: measuredHeights ? 'Y' : 'None',
      });

      bindThemeColors(row, theme, (palette) => ({
        TextColor3: palette.text,
        BackgroundColor3: palette.surfaceRaised,
      }));

      return row;
    },

    update: (row, id) => {
      row.Text = `Row ${id.toLocaleString('en-US')}${measuredHeights ? `\n${'Wrapped row content. '.repeat((Math.abs(id) % 4) + 1)}${expanded.has(id) ? '\nExpanded details.\nMore information for this row.' : ''}` : ''}`;
    },
  });

  const actions = createFrame({
    Size: udim2(1, -32, 0, 36),
    Position: udim2FromOffset(16, 64),
    BackgroundTransparency: 1,
  });
  createUIListLayout({ FillDirection: 'Horizontal', Padding: udim(0, 8) }).Parent = actions;
  actions.Parent = app;

  const insert = createButton(theme, {
    label: 'Insert at top',
    size: udim2(0.5, -4, 0, 36),
    position: udim2FromOffset(0, 0),
    textSize: 13,
  });

  let nextId = -1;

  insert.onClick(() => {
    data.update((items) => [nextId, ...items]);
    nextId -= 1;
  });

  insert.Parent = actions;

  const last = createButton(theme, {
    label: measuredHeights ? 'Expand selected' : 'Go to last row',
    size: udim2(0.5, -4, 0, 36),
    position: udim2FromOffset(0, 0),
    textSize: 13,
  });

  last.onClick(() => {
    const key = measuredHeights ? Number(selection.get() ?? 0) : data.get().at(-1)!;

    if (measuredHeights) {
      if (expanded.has(key)) {
        expanded.delete(key);
      } else {
        expanded.add(key);
      }

      data.set([...data.get()]);
    }

    list.scrollToKey(key);
    selection.set(key);
    viewport.focus();
  });

  last.Parent = actions;

  const status = createText(theme, {
    text: '',
    size: udim2(1, -32, 0, 32),
    position: udim2(0, 16, 1, -40),
    color: 'textMuted',
    textSize: 13,
  });

  status.unsafeElement.setAttribute('role', 'status');

  status.Parent = app;

  const updateStatus = (): void => {
    status.Text = `${data.get().length.toLocaleString('en-US')} items · selected ${selection.get() ?? 'none'}`;
  };

  watchOwnedValue(app, selection, updateStatus);

  watchOwnedValue(app, data, updateStatus);

  return app;
};
