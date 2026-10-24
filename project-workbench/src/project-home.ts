import {
  bindDialog,
  bindKeyedChildren,
  bindMenu,
  createFrame,
  createObservableValue,
  observeSize,
  setAccessibility,
  udim2,
  udim2FromOffset,
  vector2,
  watchOwnedValue,
  type Frame,
  type GuiElement,
  type ScreenGui,
} from 'framekit';

import type { SceneDocument } from './document';
import { createProjectTemplateDialog } from './project-template-dialog';
import type { ProjectLibrary, SavedProject } from './projects';
import { button, colors, font, input, label, panel, round, scroll, stack } from './ui';

/** The home screen owns project discovery and management; opening a project belongs to the app. */
export const createProjectHome = (
  app: ScreenGui,
  library: ProjectLibrary,
  open: (id: string) => void,
  create: (document: SceneDocument) => void,
  perform: (action: () => void) => void,
  openSettings: () => void,
): Readonly<{ view: Frame; close(): void }> => {
  const templates = createProjectTemplateDialog(app, create, perform);
  const home = panel('Projects home', app, colors.canvas);
  setAccessibility(home, { role: 'region', label: 'Projects home' });
  const header = panel('Projects header', home);
  header.Size = udim2(1, 0, 0, 72);
  const brand = label(header, '◈  FRAMEKIT', 40, 15, colors.accent);
  brand.FontWeight = 700;
  brand.LetterSpacing = 2;
  brand.Position = udim2FromOffset(28, 16);
  brand.Size = udim2FromOffset(190, 40);
  const newProject = button(header, '+ New project', () => templates.open(newProject), 144);
  newProject.Position = udim2(1, -172, 0, 20);
  newProject.BackgroundColor3 = colors.accent;
  newProject.TextColor3 = colors.canvas;
  const settings = button(header, '⚙', openSettings, 34);
  settings.AccessibleLabel = 'Settings';
  settings.Position = udim2(1, -218, 0, 20);
  const viewport = scroll(home, 'Projects');
  viewport.Position = udim2FromOffset(0, 73);
  viewport.Size = udim2(1, 0, 1, -73);
  const content = panel('Project library', viewport, colors.canvas);
  const greeting = label(content, 'Your projects', 44, 28);
  greeting.FontWeight = 650;
  greeting.Position = udim2FromOffset(0, 24);
  const storage = label(content, 'Saved automatically in this browser.', 28, 12, colors.muted);
  const search = input(content, 'Search projects');
  search.FontFamily = font;
  search.PlaceholderText = 'Search your projects…';
  const sort = button(
    content,
    'Recently edited ↓',
    () => {
      alphabetical = !alphabetical;
      publish();
    },
    158,
  );
  const cards = panel('Saved projects', content, colors.canvas);
  setAccessibility(cards, { role: 'list', label: 'Saved projects' });
  const empty = label(cards, '', 64, 14, colors.muted);
  empty.TextWrapped = true;
  const source = createObservableValue<readonly SavedProject[]>([]);
  let alphabetical = false;
  let width = 1200;

  const dialog = createFrame({
    TagName: 'dialog',
    Name: 'Manage project',
    Size: udim2FromOffset(420, 230),
    Position: udim2(0.5, 0, 0.3, 0),
    AnchorPoint: vector2(0.5, 0),
    BackgroundColor3: colors.panel,
  });
  dialog.Parent = app;
  round(dialog, 12, true);
  const dialogTitle = label(dialog, '', 36, 19);
  dialogTitle.Position = udim2FromOffset(24, 16);
  dialogTitle.Size = udim2(1, -48, 0, 36);
  const prompt = label(dialog, '', 56, 12, colors.muted);
  prompt.TextWrapped = true;
  prompt.Position = udim2FromOffset(24, 56);
  prompt.Size = udim2(1, -48, 0, 56);
  const name = input(dialog, 'Project name');
  name.Position = udim2FromOffset(24, 112);
  name.Size = udim2(1, -48, 0, 36);
  name.unsafeElement.setAttribute('maxlength', '200');
  const actions = panel('Project dialog actions', dialog);
  actions.Position = udim2(1, -224, 1, -56);
  actions.Size = udim2FromOffset(200, 32);
  stack(actions, 8, true);
  let managed: Readonly<{ id: string; action: 'rename' | 'delete' }> | undefined;
  const cancel = button(actions, 'Cancel', () => modal.close(), 92);
  const confirm = button(
    actions,
    'Rename',
    () =>
      perform(() => {
        const project = library.state.get().find((entry) => entry.id === managed?.id);

        if (!managed || !project) {
          modal.close();
          return;
        }

        if (managed.action === 'delete') {
          library.remove(project.id);
        } else {
          const value = name.Text.trim();

          if (!value) {
            name.focus();
            return;
          }

          library.save(project.id, { ...project.document, name: value.slice(0, 200) });
        }

        modal.close();
      }),
    100,
  );
  const modal = bindDialog(dialog, { initialFocus: cancel });
  name.on('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      confirm.unsafeElement.click();
    }
  });

  const manage = (id: string, action: 'rename' | 'delete', opener: GuiElement): void => {
    const project = library.state.get().find((entry) => entry.id === id);

    if (!project) {
      return;
    }

    managed = { id, action };
    dialog.Size = udim2FromOffset(
      Math.min(420, window.innerWidth - 32),
      action === 'delete' ? 200 : 230,
    );
    dialogTitle.Text = action === 'delete' ? 'Delete project?' : 'Rename project';
    setAccessibility(dialog, { label: dialogTitle.Text });
    prompt.Text =
      action === 'delete'
        ? `“${project.document.name}” will be removed from this browser. This cannot be undone.`
        : 'Give this project a name you can find later.';
    name.Visible = action === 'rename';
    name.Text = project.document.name;
    confirm.Text = action === 'delete' ? 'Delete' : 'Rename';
    confirm.AccessibleLabel = confirm.Text;
    confirm.BackgroundColor3 = action === 'delete' ? colors.danger : colors.accent;
    confirm.TextColor3 = colors.canvas;
    modal.open(opener);

    if (action === 'rename') {
      name.focus();
      name.unsafeElement.select();
    }
  };

  bindKeyedChildren(cards, source, {
    key: (project) => project.id,
    create: (project) => {
      const card = panel('Saved project', cards, colors.panel);
      card.Parent = undefined;
      round(card, 6, true);
      const title = label(card, '', 28, 14);
      title.Name = 'Project title';
      title.Position = udim2FromOffset(16, 12);
      title.Size = udim2(1, -72, 0, 28);
      title.FontWeight = 600;
      const enter = button(card, 'Open project', () => open(project.id));
      enter.Text = '';
      enter.BackgroundTransparency = 1;
      enter.Size = udim2(1, 0, 1, 0);
      const more = button(card, '•••', () => {}, 32);
      more.AccessibleLabel = `Project options ${project.id}`;
      more.Position = udim2(1, -44, 0, 10);
      more.BackgroundTransparency = 1;
      const menu = panel('Project options', app);
      menu.Size = udim2FromOffset(190, 128);
      round(menu, 8, true);
      const options = [
        button(
          menu,
          'Rename project',
          () => {
            menuBinding.close();
            manage(project.id, 'rename', more);
          },
          174,
        ),
        button(
          menu,
          'Duplicate project',
          () => {
            menuBinding.close();
            perform(() => {
              const current = library.state.get().find((entry) => entry.id === project.id);

              if (current) {
                library.create({
                  ...current.document,
                  name: `${current.document.name} copy`.slice(0, 200),
                });
              }
            });
          },
          174,
        ),
        button(
          menu,
          'Delete project',
          () => {
            menuBinding.close();
            manage(project.id, 'delete', more);
          },
          174,
        ),
      ];
      options.forEach((option, index) => {
        option.on('click', (event) => event.stopPropagation());
        option.Position = udim2FromOffset(8, 8 + index * 38);
        option.BackgroundTransparency = 1;
        option.TextXAlignment = 'Left';
      });
      options[2]!.TextColor3 = colors.danger;
      const menuBinding = bindMenu(more, menu, options);
      card.onDestroy(() => menu.destroy());
      card.unsafeElement.dataset.projectRow = '';
      setAccessibility(card, { role: 'listitem' });
      return card;
    },
    update: (card, project, index) => {
      const children = card.getChildren();
      const title = children.find((child) => child.Name === 'Project title');
      const enter = children.find((child) => child.Name === 'Open project');
      const more = children.find((child) => child.Name === '•••');

      if (title?.isA('TextLabel') && enter?.isA('TextButton') && more?.isA('TextButton')) {
        title.Text = project.document.name;
        enter.unsafeElement.title = `Edited ${new Date(project.updatedAt).toLocaleDateString()}`;
        enter.AccessibleLabel = `Open ${project.document.name}`;
        more.AccessibleLabel = `Options for ${project.document.name}`;
      }

      card.Position = udim2FromOffset(0, index * 60);
      card.Size = udim2FromOffset(width, 52);
    },
  });

  const publish = (): void => {
    const term = search.Text.trim().toLowerCase();
    const projects = [...library.state.get()]
      .filter((project) => project.document.name.toLowerCase().includes(term))
      .sort((a, b) =>
        alphabetical ? a.document.name.localeCompare(b.document.name) : b.updatedAt - a.updatedAt,
      );
    sort.Text = alphabetical ? 'Name A–Z ↓' : 'Recently edited ↓';
    source.set(projects);
    empty.Visible = projects.length === 0;
    empty.Text = library.state.get().length
      ? 'No projects match your search.'
      : 'Your projects will live here. Choose New project to get started.';
    cards.Size = udim2FromOffset(width, Math.max(80, projects.length * 60));
    content.Size = udim2FromOffset(width, 210 + Math.max(120, projects.length * 60));
  };

  const resize = (): void => {
    width = Math.min(1200, Math.max(240, window.innerWidth - (window.innerWidth < 600 ? 32 : 96)));
    content.Position = udim2FromOffset((window.innerWidth - width) / 2, 0);
    greeting.TextSize = window.innerWidth < 600 ? 24 : 28;
    storage.Position = udim2FromOffset(0, 72);
    storage.Text = library.error.get() ?? 'Saved automatically in this browser.';
    storage.TextWrapped = true;
    storage.Size = udim2(1, 0, 0, 34);
    search.Position = udim2FromOffset(0, 116);
    search.Size = udim2FromOffset(Math.max(100, width - 174), 32);
    sort.Position = udim2FromOffset(width - 158, 116);
    cards.Position = udim2FromOffset(0, 172);
    publish();
  };

  search.onTextChanged(publish);
  watchOwnedValue(home, library.state, publish);
  watchOwnedValue(home, library.error, (error) => {
    storage.Text = error ?? 'Saved automatically in this browser.';
    storage.TextColor3 = error ? colors.danger : colors.muted;
  });
  home.onDestroy(observeSize(app, resize));
  resize();
  return {
    view: home,
    close: (): void => {
      modal.close();
      templates.close();
    },
  };
};
