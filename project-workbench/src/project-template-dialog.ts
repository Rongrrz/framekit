import {
  bindDialog,
  createFrame,
  observeSize,
  setAccessibility,
  udim2,
  udim2FromOffset,
  vector2,
  type GuiElement,
  type ScreenGui,
} from 'framekit';

import type { SceneDocument } from './document';
import { projectTemplates } from './templates';
import { button, colors, label, panel, round, scroll } from './ui';

/** Template discovery is an explicit creation step, separate from the saved project library. */
export const createProjectTemplateDialog = (
  app: ScreenGui,
  create: (document: SceneDocument) => void,
  perform: (action: () => void) => void,
): Readonly<{ open(opener?: GuiElement): void; close(): void }> => {
  const dialog = createFrame({
    TagName: 'dialog',
    Name: 'New project',
    Position: udim2(0.5, 0, 0.5, 0),
    AnchorPoint: vector2(0.5, 0.5),
    BackgroundColor3: colors.panel,
  });
  dialog.Parent = app;
  round(dialog, 14, true);
  setAccessibility(dialog, { label: 'New project' });
  const title = label(dialog, 'Start a new project', 40, 24);
  title.Position = udim2FromOffset(24, 16);
  title.Size = udim2(1, -88, 0, 40);
  const hint = label(
    dialog,
    'Choose a starting point. Everything can be edited.',
    24,
    12,
    colors.muted,
  );
  hint.Position = udim2FromOffset(24, 60);
  hint.Size = udim2(1, -48, 0, 24);
  const close = button(dialog, '×', () => modal.close(), 32);
  close.AccessibleLabel = 'Close new project';
  close.Position = udim2(1, -48, 0, 20);
  const viewport = scroll(dialog, 'Project templates');
  viewport.Position = udim2FromOffset(20, 100);
  viewport.Size = udim2(1, -40, 1, -120);
  const cards = projectTemplates.map((template, index) => {
    const card = panel(template.name, viewport, colors.field);
    round(card, 10, true);
    const number = label(card, String(index + 1).padStart(2, '0'), 32, 13, colors.accent);
    number.Position = udim2FromOffset(16, 12);
    const name = label(card, template.name, 30, 16);
    name.FontWeight = 600;
    name.Position = udim2FromOffset(16, 46);
    name.Size = udim2(1, -32, 0, 30);
    const description = label(card, template.description, 50, 12, colors.muted);
    description.Position = udim2FromOffset(16, 78);
    description.Size = udim2(1, -32, 0, 50);
    description.TextWrapped = true;
    const choose = button(card, `Create ${template.name}`, () =>
      perform(() => {
        const document = template.create();
        modal.close();
        create(document);
      }),
    );
    choose.Text = '';
    choose.Size = udim2(1, 0, 1, 0);
    choose.BackgroundTransparency = 1;
    card.unsafeElement.dataset.projectTemplate = template.id;
    return card;
  });
  const modal = bindDialog(dialog, {
    initialFocus: cards[0]!.getChildren().find((node) => node.isA('TextButton'))!,
  });
  const resize = (): void => {
    const width = Math.min(820, window.innerWidth - 24);
    dialog.Size = udim2FromOffset(width, Math.min(680, window.innerHeight - 32));
    const columns = width < 620 ? 1 : 2;
    cards.forEach((card, index) => {
      card.Position = udim2(
        (index % columns) / columns,
        index % columns ? 6 : 0,
        0,
        Math.floor(index / columns) * 154,
      );
      card.Size = udim2(1 / columns, columns === 1 ? -6 : -12, 0, 142);
    });
  };
  dialog.onDestroy(observeSize(app, resize));
  resize();
  return {
    close: (): void => modal.close(),
    open: (opener): void => {
      viewport.CanvasPosition = vector2(0, 0);
      modal.open(opener);
    },
  };
};
