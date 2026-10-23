import {
  bindDialog,
  bindKeyedChildren,
  createFrame,
  createObservableValue,
  setAccessibility,
  udim2,
  udim2FromOffset,
  vector2,
  type GuiElement,
  type ScreenGui,
  type TextButton,
} from 'framekit';

import { button, colors, input, label, round, scroll } from './ui';

/** Commands belong to the application; the palette only owns search, focus, and activation. */
export type Command = Readonly<{ id: string; label: string; hint: string; run: () => void }>;

/** The same searchable native modal serves commands, insertion, and parent selection. */
export const createCommandPalette = (
  app: ScreenGui,
  perform: (action: () => void) => void,
): Readonly<{
  open(title: string, commands: readonly Command[], opener?: GuiElement): void;
}> => {
  const dialog = createFrame({
    TagName: 'dialog',
    Name: 'Command palette',
    Position: udim2(0.5, 0, 0.2, 0),
    AnchorPoint: vector2(0.5, 0),
    Size: udim2(1, -32, 0, 440),
    BackgroundColor3: colors.panel,
    ClipsDescendants: true,
  });
  dialog.Parent = app;
  round(dialog, 12, true);
  const title = label(dialog, 'Commands', 36, 12, colors.muted);
  title.Position = udim2FromOffset(20, 8);
  title.Size = udim2(1, -80, 0, 36);
  const close = button(dialog, '✕', () => modal.close(), 30);
  close.AccessibleLabel = 'Close commands';
  close.Position = udim2(1, -46, 0, 12);
  const search = input(dialog, 'Search commands');
  search.PlaceholderText = 'Type a command…';
  search.Position = udim2FromOffset(16, 52);
  search.Size = udim2(1, -32, 0, 40);
  const viewport = scroll(dialog, 'Commands');
  viewport.Position = udim2FromOffset(12, 104);
  viewport.Size = udim2(1, -24, 1, -144);
  const hint = label(dialog, '↑ ↓ to navigate   ↵ to run   esc to close', 28, 10, colors.faint);
  hint.Position = udim2(0, 20, 1, -32);
  const empty = label(viewport, 'No matching commands.', 40, 12, colors.muted);
  const modal = bindDialog(dialog, { initialFocus: search });
  const source = createObservableValue<readonly Command[]>([]);
  const items = new Map<string, TextButton>();
  let commands: readonly Command[] = [];
  let active = 0;
  setAccessibility(dialog, { label: 'Commands' });

  const activate = (command: Command): void => {
    modal.close();
    perform(command.run);
  };

  bindKeyedChildren(viewport, source, {
    key: (command) => command.id,
    create: (command) => {
      const row = button(viewport, command.label, () => {
        const current = source.get().find((item) => item.id === command.id);

        if (current) {
          activate(current);
        }
      });
      row.Parent = undefined;
      row.TextXAlignment = 'Left';
      row.AccessibleLabel = command.label;
      row.unsafeElement.title = command.hint;
      items.set(command.id, row);
      row.onDestroy(() => items.delete(command.id));
      return row;
    },
    update: (row, command, index) => {
      row.Text = `   ${command.label}`;
      row.unsafeElement.title = command.hint;
      row.Position = udim2FromOffset(0, index * 40);
      row.Size = udim2(1, -6, 0, 36);
      row.BackgroundColor3 = index === active ? colors.selected : colors.panel;
      row.TextColor3 = index === active ? colors.accent : colors.text;
    },
  });

  const publish = (): void => {
    const term = search.Text.trim().toLowerCase();
    const filtered = commands.filter((command) =>
      `${command.label} ${command.hint}`.toLowerCase().includes(term),
    );
    active = Math.max(0, Math.min(active, filtered.length - 1));
    source.set(filtered);
    empty.Visible = filtered.length === 0;
  };

  search.onTextChanged(() => {
    active = 0;
    publish();
  });
  search.on('keydown', (event) => {
    if (event.isComposing) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const count = source.get().length;
      active = count ? (active + (event.key === 'ArrowDown' ? 1 : count - 1)) % count : 0;
      publish();
      const command = source.get()[active];
      if (command) {
        items.get(command.id)?.unsafeElement.scrollIntoView({ block: 'nearest' });
      }
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const command = source.get()[active];
      if (command) {
        activate(command);
      }
    }
  });

  const resize = (): void => {
    dialog.Size = udim2FromOffset(
      Math.min(560, window.innerWidth - 32),
      Math.min(440, window.innerHeight - 48),
    );
    dialog.Position = udim2(0.5, 0, 0, Math.min(120, window.innerHeight * 0.12));
  };

  const controller = new AbortController();
  window.addEventListener('resize', resize, { signal: controller.signal });
  app.onDestroy(() => controller.abort());

  return {
    open: (nextTitle, nextCommands, opener): void => {
      commands = nextCommands;
      title.Text = nextTitle;
      setAccessibility(dialog, { label: nextTitle });
      search.Text = '';
      active = 0;
      publish();
      resize();
      modal.open(opener);
    },
  };
};
