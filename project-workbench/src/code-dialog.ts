import {
  bindDialog,
  color3FromHex,
  createFrame,
  createScrollingFrame,
  createTextLabel,
  createUIPadding,
  setAccessibility,
  udim,
  udim2,
  udim2FromOffset,
  vector2,
  type GuiElement,
  type ScreenGui,
} from 'framekit';

import { codeThemes, type CodeResponse, type CodeTheme, type PreparedCode } from './code-themes';
import type { Editor } from './editor';
import { exportTypeScript } from './export';
import { button, colors, label, mono, panel, round, stack } from './ui';

const themeStorageKey = 'framekit-workbench-code-theme';

const restoreTheme = (): CodeTheme => {
  try {
    const saved = localStorage.getItem(themeStorageKey);
    return codeThemes.find((theme) => theme.id === saved)?.id ?? 'github-dark';
  } catch {
    return 'github-dark';
  }
};

/** Formatting runs in a lazy worker; the main editor owns only presentation and file actions. */
export const createCodeDialog = (
  app: ScreenGui,
  editor: Editor,
  download: (text: string, extension: 'ts') => void,
  report: (message: string) => void,
): Readonly<{ open(opener?: GuiElement): void; close(): void }> => {
  const dialog = createFrame({
    TagName: 'dialog',
    Name: 'TypeScript export',
    Position: udim2(0.5, 0, 0.5, 0),
    AnchorPoint: vector2(0.5, 0.5),
    BackgroundColor3: colors.panel,
  });
  dialog.Parent = app;
  round(dialog, 16, true);
  setAccessibility(dialog, { label: 'Export TypeScript' });
  const heading = label(dialog, 'Export TypeScript', 36, 23);
  heading.FontWeight = 600;
  heading.Position = udim2FromOffset(28, 20);
  heading.Size = udim2(1, -96, 0, 36);
  const description = label(
    dialog,
    'Formatted TypeScript, ready to copy into your project.',
    24,
    12,
    colors.muted,
  );
  description.Position = udim2FromOffset(28, 58);
  description.Size = udim2(1, -56, 0, 24);
  const close = button(dialog, '✕', () => modal.close(), 34);
  close.AccessibleLabel = 'Close export';
  close.Position = udim2(1, -54, 0, 22);
  const frame = panel('Source preview', dialog, colors.field);
  frame.Position = udim2FromOffset(20, 104);
  frame.Size = udim2(1, -40, 1, -188);
  frame.ClipsDescendants = true;
  round(frame, 10, true);
  const filebar = panel('Source toolbar', frame, colors.raised);
  filebar.Size = udim2(1, 0, 0, 48);
  const filename = label(filebar, 'scene.ts', 48, 12);
  filename.Position = udim2FromOffset(18, 0);
  filename.Size = udim2FromOffset(220, 48);
  filename.FontFamily = mono;
  const themeBar = panel('Code themes', filebar, colors.raised);
  themeBar.Position = udim2(1, -360, 0, 8);
  themeBar.Size = udim2FromOffset(348, 32);
  stack(themeBar, 4, true);
  setAccessibility(themeBar, { role: 'group', label: 'Code theme' });
  const viewport = createScrollingFrame({
    Name: 'Generated TypeScript',
    Position: udim2FromOffset(0, 48),
    Size: udim2(1, 0, 1, -48),
    ScrollingDirection: 'XY',
    AutomaticCanvasSize: 'XY',
    BackgroundColor3: colors.field,
    ScrollBarThickness: 8,
    ScrollBarImageColor3: colors.faint,
  });
  viewport.Parent = frame;
  viewport.unsafeElement.dataset.workbenchCode = '';
  setAccessibility(viewport, { role: 'region', label: 'Generated TypeScript', focusable: true });
  const gutter = createTextLabel({
    Name: 'Line numbers',
    TextTagName: 'pre',
    Position: udim2FromOffset(16, 20),
    Size: udim2FromOffset(36, 0),
    AutomaticSize: 'Y',
    TextSize: 12,
    LineHeight: 24 / 12,
    FontFamily: mono,
    TextColor3: colors.faint,
    BackgroundTransparency: 1,
    TextXAlignment: 'Right',
    TextYAlignment: 'Top',
  });
  gutter.Parent = viewport;
  gutter.unsafeElement.setAttribute('aria-hidden', 'true');
  const content = createTextLabel({
    Name: 'Highlighted source',
    TextTagName: 'pre',
    Position: udim2FromOffset(72, 20),
    AutomaticSize: 'XY',
    TextSize: 14,
    LineHeight: 24 / 14,
    FontFamily: mono,
    RichText: true,
    TextSelectable: true,
    TextXAlignment: 'Left',
    TextYAlignment: 'Top',
    BackgroundTransparency: 1,
    TextColor3: colors.text,
  });
  createUIPadding({ PaddingRight: udim(0, 28), PaddingBottom: udim(0, 24) }).Parent = content;
  content.Parent = viewport;
  const summary = label(dialog, 'Preparing source…', 22, 11, colors.muted);
  summary.Position = udim2(0, 28, 1, -69);
  summary.Size = udim2(1, -56, 0, 22);
  summary.ClipsDescendants = true;
  const copy = button(
    dialog,
    'Copy code',
    () => {
      if (!navigator.clipboard) {
        report('Clipboard is unavailable. Select the source or download the file.');
        return;
      }

      navigator.clipboard
        .writeText(source)
        .then(() => {
          if (!app.isDestroyed()) {
            copy.Text = '✓ Copied';
            report('Formatted TypeScript copied to clipboard.');
          }
        })
        .catch(() => {
          if (!app.isDestroyed()) {
            report('Clipboard is unavailable. Select the source or download the file.');
          }
        });
    },
    118,
  );
  copy.Position = udim2(1, -146, 1, -52);
  copy.BackgroundColor3 = colors.accent;
  copy.TextColor3 = colors.canvas;
  const save = button(dialog, 'Download .ts', () => download(source, 'ts'), 126);
  save.Position = udim2(0, 28, 1, -52);
  const modal = bindDialog(dialog, { initialFocus: viewport });
  let source = '';
  let prepared: PreparedCode | undefined;
  let theme = restoreTheme();
  let worker: Worker | undefined;
  let requestId = 0;

  const applyTheme = (): void => {
    const palette = prepared?.palettes[theme];

    if (palette) {
      content.Text = palette.text;
      content.TextColor3 = color3FromHex(palette.foreground);
      viewport.BackgroundColor3 = color3FromHex(palette.background);
      gutter.TextColor3 = color3FromHex(palette.muted);
    }

    for (const entry of themeButtons) {
      const selected = entry.id === theme;
      entry.button.BackgroundColor3 = selected ? colors.selected : colors.raised;
      entry.button.TextColor3 = selected ? colors.accent : colors.muted;
      entry.button.unsafeElement.setAttribute('aria-pressed', String(selected));
    }
  };

  const themeButtons = codeThemes.map((entry) => ({
    id: entry.id,
    button: button(
      themeBar,
      entry.label,
      () => {
        theme = entry.id;
        applyTheme();

        try {
          localStorage.setItem(themeStorageKey, theme);
        } catch {
          // Theme selection stays usable when browser storage is unavailable.
        }
      },
      entry.id === 'catppuccin-mocha' ? 104 : 116,
    ),
  }));

  const showSource = (): void => {
    const lines = source.trimEnd().split('\n');
    gutter.Text = lines.map((_, index) => String(index + 1)).join('\n');
    summary.Text = `${lines.length} lines · TypeScript`;
    applyTheme();
    copy.Disabled = false;
    save.Disabled = false;
  };

  const failed = (): void => {
    if (dialog.isDestroyed()) {
      return;
    }

    content.RichText = false;
    content.Text = source;
    showSource();
    summary.Text = 'Formatting unavailable. You can still copy or download the source.';
    worker?.terminate();
    worker = undefined;
  };

  const resize = (): void => {
    const width = Math.min(1100, window.innerWidth - 32);
    dialog.Size = udim2FromOffset(width, Math.min(820, window.innerHeight - 32));
    const compact = width < 700;
    filebar.Size = udim2(1, 0, 0, compact ? 88 : 48);
    themeBar.Position = compact ? udim2FromOffset(12, 44) : udim2(1, -360, 0, 8);
    themeBar.Size = udim2FromOffset(compact ? width - 64 : 348, 32);
    themeButtons.forEach((entry) => {
      entry.button.Size = udim2FromOffset(
        compact ? (width - 72) / 3 : entry.id === 'catppuccin-mocha' ? 104 : 116,
        32,
      );
      entry.button.TextSize = compact ? 10 : 11;
    });
    viewport.Position = udim2FromOffset(0, compact ? 88 : 48);
    viewport.Size = udim2(1, 0, 1, compact ? -88 : -48);
    description.Visible = width >= 500;
    heading.TextSize = compact ? 18 : 23;
  };
  const controller = new AbortController();
  window.addEventListener('resize', resize, { signal: controller.signal });
  app.onDestroy(() => {
    controller.abort();
    worker?.terminate();
  });
  viewport.on('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      document.getSelection()?.selectAllChildren(content.unsafeElement);
    }
  });

  return {
    close: (): void => modal.close(),
    open: (opener): void => {
      source = exportTypeScript(editor.state.get().document);
      prepared = undefined;
      content.RichText = false;
      content.Text = 'Preparing your TypeScript…';
      gutter.Text = '';
      summary.Text = 'Formatting and highlighting…';
      copy.Text = 'Copy code';
      copy.Disabled = true;
      save.Disabled = true;
      filename.Text = `${
        editor.state
          .get()
          .document.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'scene'
      }.ts`;
      viewport.CanvasPosition = vector2(0, 0);
      applyTheme();
      resize();
      modal.open(opener);
      requestId += 1;

      try {
        if (!worker) {
          worker = new Worker(new URL('./code-worker.ts', import.meta.url), { type: 'module' });
          worker.onmessage = (event: MessageEvent<CodeResponse>): void => {
            if (dialog.isDestroyed() || event.data.id !== requestId) {
              return;
            }

            if ('error' in event.data) {
              failed();
              return;
            }

            prepared = event.data.result;
            source = prepared.source;
            content.RichText = true;
            showSource();
          };
          worker.onerror = failed;
        }

        worker.postMessage({ id: requestId, source });
      } catch {
        failed();
      }
    },
  };
};
