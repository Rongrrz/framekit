import {
  bindDialog,
  color3FromHex,
  createFrame,
  createTextArea,
  observeSize,
  setAccessibility,
  udim2,
  udim2FromOffset,
  vector2,
  type GuiElement,
  type ScreenGui,
} from 'framekit';

import type { CodeResponse, CodeTheme } from './code-themes';
import { parseNetworkOrigins } from './document';
import type { Editor } from './editor';
import { button, colors, input, label, mono, round } from './ui';

/** Source is an editing buffer until Apply; ownership and history remain with the scene editor. */
export const createScriptDialog = (
  app: ScreenGui,
  editor: Editor,
  getTheme: () => CodeTheme,
): Readonly<{ open(id: string, opener?: GuiElement): void; close(): void }> => {
  const dialog = createFrame({
    TagName: 'dialog',
    Name: 'Script editor',
    Position: udim2(0.5, 0, 0.5, 0),
    AnchorPoint: vector2(0.5, 0.5),
    BackgroundColor3: colors.panel,
  });
  dialog.Parent = app;
  round(dialog, 12, true);
  setAccessibility(dialog, { label: 'TypeScript script' });
  const title = label(dialog, 'Script', 36, 20);
  title.Position = udim2FromOffset(20, 12);
  title.Size = udim2(1, -280, 0, 36);
  const format = button(dialog, 'Format', () => formatSource(), 78);
  format.Position = udim2(1, -252, 0, 14);
  const apply = button(dialog, 'Apply script', () => save(), 100);
  apply.Position = udim2(1, -166, 0, 14);
  apply.BackgroundColor3 = colors.accent;
  apply.TextColor3 = colors.canvas;
  const cancel = button(dialog, '×', () => modal.close(), 32);
  cancel.AccessibleLabel = 'Close script editor';
  cancel.Position = udim2(1, -52, 0, 14);
  const hint = label(
    dialog,
    'TypeScript · default export receives ctx · use ctx helpers or return your cleanup function',
    24,
    11,
    colors.muted,
  );
  hint.Position = udim2FromOffset(20, 54);
  hint.Size = udim2(1, -40, 0, 24);
  const source = createTextArea({
    Name: 'TypeScript source',
    AccessibleLabel: 'TypeScript source',
    TextSize: 13,
    FontFamily: mono,
    TextWrapped: false,
    LineHeight: 1.6,
    Position: udim2FromOffset(20, 88),
    Size: udim2(1, -40, 1, -290),
  });
  source.Parent = dialog;
  source.unsafeElement.spellcheck = false;
  source.unsafeElement.setAttribute('autocapitalize', 'off');
  source.unsafeElement.setAttribute('autocomplete', 'off');
  round(source, 8, true);
  const originsLabel = label(dialog, 'Script settings · allowed backend origins', 28, 13);
  originsLabel.Position = udim2(0, 20, 1, -190);
  const origins = input(dialog, 'Allowed backend origins');
  origins.PlaceholderText = 'https://api.example.com, https://another.example.com';
  origins.Position = udim2(0, 20, 1, -156);
  origins.Size = udim2(1, -40, 0, 32);
  const note = label(
    dialog,
    'Empty blocks backend requests. These project permissions apply in Present and the ZIP.\nAPIs must support CORS from an opaque preview origin. Keep server secrets on your backend.',
    44,
    11,
    colors.muted,
  );
  note.Position = udim2(0, 20, 1, -116);
  note.Size = udim2(1, -40, 0, 44);
  note.TextWrapped = true;
  const status = label(
    dialog,
    'Use managed ctx helpers to clean up listeners, timers, requests, and objects.',
    38,
    11,
    colors.muted,
  );
  status.Position = udim2(0, 20, 1, -60);
  status.Size = udim2(1, -40, 0, 44);
  status.TextWrapped = true;
  setAccessibility(status, { role: 'status' });
  let currentId = '';
  let currentPrefab: string | null = null;
  let worker: Worker | undefined;
  const stop = (): void => {
    worker?.terminate();
    worker = undefined;
    format.Disabled = false;
  };
  const modal = bindDialog(dialog, { initialFocus: source });
  dialog.on('close', stop);
  dialog.onDestroy(stop);
  const save = (): void => {
    try {
      const snapshot = editor.state.get();
      if (
        snapshot.prefabId !== currentPrefab ||
        !snapshot.document.nodes.some((node) => node.id === currentId && node.type === 'Script')
      ) {
        throw new Error('The script no longer exists in this scope.');
      }
      const networkOrigins = parseNetworkOrigins(
        origins.Text.split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      );
      editor.edit(currentId, 'Source', source.Text);
      editor.setNetworkOrigins(networkOrigins);
      modal.close();
    } catch (error) {
      status.Text = error instanceof Error ? error.message : String(error);
    }
  };
  const formatSource = (): void => {
    stop();
    const before = source.Text;
    format.Disabled = true;
    worker = new Worker(new URL('./code-worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<CodeResponse>) => {
      stop();
      if ('error' in event.data) {
        status.Text = event.data.error;
      } else if (source.Text === before) {
        source.Text = event.data.result.source;
        status.Text = 'Formatted. Apply script to save.';
      }
    };
    worker.onerror = () => {
      stop();
      status.Text = 'Formatting unavailable. You can still edit and apply the source.';
    };
    worker.postMessage({ id: 1, source: before, language: 'typescript' });
  };
  const resize = (): void => {
    dialog.Size = udim2FromOffset(
      Math.min(1000, window.innerWidth - 24),
      Math.min(800, window.innerHeight - 24),
    );
  };
  dialog.onDestroy(observeSize(app, resize));
  resize();
  return {
    close: () => modal.close(),
    open: (id, opener): void => {
      const snapshot = editor.state.get();
      const node = snapshot.document.nodes.find((node) => node.id === id && node.type === 'Script');
      if (!node) {
        return;
      }
      currentId = id;
      currentPrefab = snapshot.prefabId;
      title.Text = node.properties.Name;
      source.Text = String(node.properties.Source);
      origins.Text = snapshot.project.networkOrigins?.join(', ') ?? '';
      const light = getTheme() === 'github-light';
      source.BackgroundColor3 = color3FromHex(light ? '#ffffff' : '#24292e');
      source.TextColor3 = color3FromHex(light ? '#24292e' : '#e1e4e8');
      status.Text =
        'Apply saves this script and its project backend permissions. Closing discards edits.';
      modal.open(opener);
    },
  };
};
