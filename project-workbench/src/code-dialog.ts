import {
  bindDialog,
  createFrame,
  createTextArea,
  setAccessibility,
  udim2,
  udim2FromOffset,
  vector2,
  type ScreenGui,
  type GuiElement,
} from 'framekit';

import type { Editor } from './editor';
import { exportTypeScript } from './export';
import { button, colors, label, mono, round } from './ui';

/** Generated source is an artifact of the document at the moment the dialog opens. */
export const createCodeDialog = (
  app: ScreenGui,
  editor: Editor,
  download: (text: string, extension: 'ts') => void,
  report: (message: string) => void,
): Readonly<{
  open(opener?: GuiElement): void;
}> => {
  const dialog = createFrame({
    TagName: 'dialog',
    Name: 'TypeScript export',
    Position: udim2(0.5, 0, 0.5, 0),
    AnchorPoint: vector2(0.5, 0.5),
    BackgroundColor3: colors.panel,
  });
  dialog.Parent = app;
  round(dialog, 12, true);
  setAccessibility(dialog, { label: 'Export TypeScript' });
  const heading = label(dialog, 'Your scene, as TypeScript.', 40, 18);
  heading.Position = udim2FromOffset(20, 12);
  heading.Size = udim2(1, -76, 0, 40);
  const close = button(dialog, '✕', () => modal.close(), 32);
  close.AccessibleLabel = 'Close export';
  close.Position = udim2(1, -48, 0, 16);
  const description = label(
    dialog,
    'Import from framekit, provide an #app mount point, and run.',
    28,
    11,
    colors.muted,
  );
  description.Position = udim2FromOffset(20, 54);
  description.Size = udim2(1, -40, 0, 28);
  const code = createTextArea({
    Name: 'Generated TypeScript',
    AccessibleLabel: 'Generated TypeScript',
    ReadOnly: true,
    Position: udim2FromOffset(20, 94),
    Size: udim2(1, -40, 1, -166),
    TextSize: 12,
    FontFamily: mono,
    TextColor3: colors.text,
    BackgroundColor3: colors.field,
    TextWrapped: false,
  });
  round(code, 6, true);
  code.Parent = dialog;
  const copy = button(
    dialog,
    'Copy code',
    () => {
      if (!navigator.clipboard) {
        report('Clipboard is unavailable. Select the source or download the file.');
        return;
      }

      navigator.clipboard
        .writeText(code.Text)
        .then(() => {
          if (!app.isDestroyed()) {
            report('TypeScript copied to clipboard.');
          }
        })
        .catch(() => {
          if (!app.isDestroyed()) {
            report('Clipboard is unavailable. Select the source or download the file.');
          }
        });
    },
    108,
  );
  copy.Position = udim2(0, 20, 1, -52);
  const save = button(dialog, 'Download .ts', () => download(code.Text, 'ts'), 120);
  save.Position = udim2(0, 136, 1, -52);
  const modal = bindDialog(dialog, { initialFocus: code });
  const resize = (): void => {
    dialog.Size = udim2FromOffset(
      Math.min(880, window.innerWidth - 32),
      Math.min(680, window.innerHeight - 32),
    );
  };
  const controller = new AbortController();
  window.addEventListener('resize', resize, { signal: controller.signal });
  app.onDestroy(() => controller.abort());

  return {
    open: (opener): void => {
      code.Text = exportTypeScript(editor.state.get().document);
      resize();
      modal.open(opener);
    },
  };
};
