import {
  bindVirtualList,
  createObservableValue,
  createScreenGui,
  createScrollingFrame,
  createTextLabel,
  udim2,
  udim2FromOffset,
  watchOwnedValue,
} from 'framekit';

import {
  bindDocumentTheme,
  bindThemeColors,
  fonts,
  installPlaygroundStyles,
  themes,
} from './theme';
import { createButton, createText } from './ui';

const measuredHeights = new URLSearchParams(window.location.search).get('heights') === 'variable';

const expanded = new Set<number>();

installPlaygroundStyles();

const app = createScreenGui({ Name: 'CollectionStressTest' });

const theme = createObservableValue(themes.dark);

bindDocumentTheme(app, createObservableValue('dark'));

const data = createObservableValue<readonly number[]>(
  Array.from({ length: 100_000 }, (_, index) => index),
);

const selection = createObservableValue<string | number | undefined>(0);

createText(theme, {
  text: `FrameKit / 100,000 ${measuredHeights ? 'measured' : 'fixed-height'} rows`,
  size: udim2(1, -32, 0, 32),
  position: udim2FromOffset(16, 16),
  textSize: 24,
  weight: 800,
}).Parent = app;

const viewport = createScrollingFrame({
  Name: 'VirtualCollection',
  Size: udim2(1, -32, 1, -160),
  Position: udim2FromOffset(16, 112),
  BackgroundColor3: themes.dark.surface,
  ScrollBarImageColor3: themes.dark.textMuted,
});

viewport.unsafeElement.setAttribute('aria-label', 'Virtual collection');

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

const insert = createButton(theme, {
  label: 'Insert at top',
  size: udim2FromOffset(160, 36),
  position: udim2FromOffset(16, 64),
  textSize: 13,
});

let nextId = -1;

insert.onClick(() => {
  data.update((items) => [nextId, ...items]);
  nextId -= 1;
});

insert.Parent = app;

const last = createButton(theme, {
  label: measuredHeights ? 'Expand selected' : 'Go to last row',
  size: udim2FromOffset(160, 36),
  position: udim2FromOffset(188, 64),
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

last.Parent = app;

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
  status.Text = `${data.get().length.toLocaleString('en-US')} items · selected ${selection.get() ?? 'none'} · Arrow keys / Home / End / Page Up / Page Down`;
};

watchOwnedValue(app, selection, updateStatus);

viewport.on('scroll', updateStatus);

watchOwnedValue(app, data, updateStatus);

app.mount('#root');

requestAnimationFrame(updateStatus);

if (import.meta.hot) {
  import.meta.hot.dispose(() => app.destroy());
}

if (import.meta.env.DEV) {
  const { bindRuntimeInspector } = await import('framekit/devtools');
  bindRuntimeInspector(app, { shortcut: { key: 'F8' } });
}
