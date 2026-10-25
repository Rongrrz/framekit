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

import { setIcon } from './icons/ai-decorations';
import type { IconName } from './icons/ai-icons';
import { button, colors, font, iconButton, input, label, panel, round, scroll } from './ui';

/** Commands belong to the application; the palette only owns search, focus, and activation. */
export type Command = Readonly<{
  id: string;
  label: string;
  hint: string;
  icon?: IconName;
  run: () => void;
}>;

/** The same searchable native modal serves commands, insertion, and parent selection. */
export const createCommandPalette = (
  app: ScreenGui,
  perform: (action: () => void) => void,
): Readonly<{
  open(title: string, commands: readonly Command[], opener?: GuiElement): void;
  close(): void;
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
  const close = iconButton(dialog, 'close', 'Close commands', () => modal.close(), 30);
  close.Position = udim2(1, -46, 0, 12);
  const search = input(dialog, 'Search commands');
  search.PlaceholderText = 'Type a command…';
  search.FontFamily = font;
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
      const row = panel('Command result', viewport);
      row.Parent = undefined;
      round(row, 7);
      const name = label(row, '', 28, 13);
      name.Name = 'Command label';
      name.Position = udim2FromOffset(0, 3);
      name.Size = udim2(1, -12, 0, 28);
      const detail = label(row, '', 18, 11, colors.muted);
      detail.Name = 'Command detail';
      detail.Position = udim2FromOffset(34, 30);
      detail.Size = udim2(1, -46, 0, 18);
      detail.ClipsDescendants = true;
      const control = button(row, command.label, () => {
        const current = source.get().find((item) => item.id === command.id);

        if (current) {
          activate(current);
        }
      });
      control.Text = '';
      control.Size = udim2(1, 0, 1, 0);
      control.BackgroundTransparency = 1;
      control.unsafeElement.title = command.hint;
      items.set(command.id, control);
      row.onDestroy(() => items.delete(command.id));
      return row;
    },
    update: (row, command, index) => {
      row.Position = udim2FromOffset(0, index * 56);
      row.Size = udim2(1, -6, 0, 52);
      row.BackgroundColor3 = index === active ? colors.selected : colors.panel;

      for (const child of row.getChildren()) {
        if (child.isA('TextLabel') && child.Name === 'Command label') {
          child.Text = command.label;
          child.TextColor3 = index === active ? colors.accent : colors.text;
          setIcon(child, command.icon ?? 'command');
        } else if (child.isA('TextLabel') && child.Name === 'Command detail') {
          child.Text = command.hint;
        } else if (child.isA('TextButton')) {
          child.AccessibleLabel = command.label;
          child.unsafeElement.title = command.hint;
        }
      }
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
    close: (): void => modal.close(),
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
