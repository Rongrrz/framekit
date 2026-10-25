import {
  bindDialog,
  bindKeyedChildren,
  bindMenu,
  createFrame,
  createObservableValue,
  observeSize,
  setAccessibility,
  udim,
  udim2,
  udim2FromOffset,
  vector2,
  watchOwnedValue,
  type Frame,
  type GuiElement,
  type ScreenGui,
} from 'framekit';

import { parseDocument, type SceneDocument } from './document';
import { createDropdown } from './dropdown';
import { setIcon } from './icons/ai-decorations';
import { createProjectTemplateDialog } from './project-template-dialog';
import type { ProjectLibrary, SavedProject } from './projects';
import { button, colors, font, iconButton, input, label, panel, round, scroll, stack } from './ui';

/** The home screen owns project discovery and management; opening a project belongs to the app. */
export const createProjectHome = (
  app: ScreenGui,
  library: ProjectLibrary,
  open: (id: string) => void,
  create: (document: SceneDocument) => void,
  perform: (action: () => void) => void,
  openSettings: () => void,
  downloadProject: (document: SceneDocument) => void,
): Readonly<{ view: Frame; newProject(opener?: GuiElement): void; close(): void }> => {
  const templates = createProjectTemplateDialog(app, create, perform);
  const home = panel('Projects home', app, colors.canvas);
  setAccessibility(home, { role: 'region', label: 'Projects home' });
  const header = panel('Projects header', home);
  header.Size = udim2(1, 0, 0, 72);
  header.unsafeElement.dataset.workbenchDivider = 'bottom';
  const mark = label(header, 'F', 34, 22, colors.canvas);
  mark.Position = udim2FromOffset(24, 19);
  mark.Size = udim2FromOffset(34, 34);
  mark.BackgroundTransparency = 0;
  mark.BackgroundColor3 = colors.accent;
  mark.FontWeight = 750;
  mark.TextXAlignment = 'Center';
  round(mark, 9);
  const brand = label(header, 'FrameKit', 24, 16);
  brand.FontWeight = 650;
  brand.Position = udim2FromOffset(70, 13);
  brand.Size = udim2FromOffset(100, 24);
  const brandHint = label(header, 'Workbench', 20, 11, colors.muted);
  brandHint.Position = udim2FromOffset(70, 37);
  brandHint.Size = udim2FromOffset(100, 20);
  const newProject = button(header, '+ New project', () => templates.open(newProject), 144);
  newProject.Text = 'New project';
  setIcon(newProject, 'plus');
  newProject.Position = udim2(1, -172, 0, 20);
  newProject.BackgroundColor3 = colors.accent;
  newProject.TextColor3 = colors.canvas;
  const settings = iconButton(header, 'settings', 'Settings', openSettings, 34);
  settings.Position = udim2(1, -218, 0, 20);
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.hidden = true;
  fileInput.setAttribute('aria-label', 'Project backup file');
  home.unsafeElement.append(fileInput);
  const importProject = button(
    header,
    'Import project',
    () => {
      importStatus.Text = '';
      resize();
      fileInput.click();
    },
    126,
  );
  setIcon(importProject, 'folder');
  const viewport = scroll(home, 'Projects');
  viewport.Position = udim2FromOffset(0, 73);
  viewport.Size = udim2(1, 0, 1, -73);
  const content = panel('Project library', viewport, colors.canvas);
  const greeting = label(content, 'Your projects', 44, 30);
  greeting.FontWeight = 650;
  greeting.Position = udim2FromOffset(0, 36);
  const storage = label(content, 'Saved automatically in this browser.', 28, 12, colors.muted);
  const importStatus = label(content, '', 32, 12, colors.danger);
  importStatus.TextWrapped = true;
  setAccessibility(importStatus, { role: 'status' });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';

    if (!file) {
      return;
    }

    if (file.size > 5_000_000) {
      importStatus.Text = 'Could not import project. Documents must be smaller than 5 MB.';
      resize();
      return;
    }

    void file
      .text()
      .then((text) => {
        if (home.isDestroyed()) {
          return;
        }

        const project = parseDocument(text);
        importStatus.Text = '';
        resize();
        create(project);
      })
      .catch((error: unknown) => {
        if (!home.isDestroyed()) {
          importStatus.Text = `Could not import project. ${error instanceof Error ? error.message : String(error)}`;
          resize();
        }
      });
  });

  const search = input(content, 'Search projects');
  search.FontFamily = font;
  search.PlaceholderText = 'Search your projects…';
  const searchPadding = search.getChildren().find((child) => child.isA('UIPadding'));

  if (searchPadding?.isA('UIPadding')) {
    searchPadding.PaddingLeft = udim(0, 36);
  }
  const searchIcon = label(content, '', 32, 12, colors.faint);
  searchIcon.Size = udim2FromOffset(34, 32);
  setIcon(searchIcon, 'search', 'only');
  searchIcon.unsafeElement.style.pointerEvents = 'none';
  let sortOrder: 'recent' | 'name' | 'name-desc' = 'recent';
  const sort = createDropdown(content, {
    label: 'Sort projects',
    width: 184,
    choices: [
      { value: 'recent', label: 'Last edited' },
      { value: 'name', label: 'Name · A–Z' },
      { value: 'name-desc', label: 'Name · Z–A' },
    ] as const,
    value: () => sortOrder,
    change: (value) => {
      sortOrder = value;
      publish();
    },
  });
  const columns = panel('Project columns', content, colors.canvas);
  columns.Size = udim2(1, 0, 0, 32);
  columns.unsafeElement.dataset.workbenchDivider = 'bottom';
  const nameColumn = label(columns, 'Name', 32, 11, colors.muted);
  nameColumn.Position = udim2FromOffset(16, 0);
  const sizeColumn = label(columns, 'Canvas size', 32, 11, colors.muted);
  sizeColumn.Position = udim2(1, -340, 0, 0);
  sizeColumn.Size = udim2FromOffset(140, 32);
  const dateColumn = label(columns, 'Last edited', 32, 11, colors.muted);
  dateColumn.Position = udim2(1, -190, 0, 0);
  dateColumn.Size = udim2FromOffset(140, 32);
  const cards = panel('Saved projects', content, colors.canvas);
  setAccessibility(cards, { role: 'list', label: 'Saved projects' });
  const empty = panel('Empty project library', cards, colors.panel);
  empty.Size = udim2(1, 0, 0, 270);
  round(empty, 10, true);
  const emptyIcon = label(empty, '', 48, 20, colors.accent);
  emptyIcon.Position = udim2(0.5, -24, 0, 30);
  emptyIcon.Size = udim2FromOffset(48, 48);
  emptyIcon.BackgroundTransparency = 0;
  emptyIcon.BackgroundColor3 = colors.selected;
  round(emptyIcon, 12);
  setIcon(emptyIcon, 'folder', 'only');
  const emptyTitle = label(empty, '', 32, 18);
  emptyTitle.Position = udim2FromOffset(20, 96);
  emptyTitle.Size = udim2(1, -40, 0, 32);
  emptyTitle.TextXAlignment = 'Center';
  emptyTitle.FontWeight = 600;
  const emptyHint = label(empty, '', 48, 12, colors.muted);
  emptyHint.TextWrapped = true;
  emptyHint.Position = udim2FromOffset(24, 132);
  emptyHint.Size = udim2(1, -48, 0, 48);
  emptyHint.TextXAlignment = 'Center';
  const emptyAction = button(
    empty,
    'Create a project',
    () => {
      if (library.state.get().length) {
        search.Text = '';
        publish();
        search.focus();
      } else {
        templates.open(emptyAction);
      }
    },
    160,
  );
  emptyAction.Position = udim2(0.5, -80, 0, 202);
  emptyAction.BackgroundColor3 = colors.selected;
  emptyAction.TextColor3 = colors.accent;
  const source = createObservableValue<readonly SavedProject[]>([]);
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
      card.unsafeElement.dataset.workbenchDivider = 'bottom';
      const icon = label(card, '', 36, 12, colors.muted);
      icon.Position = udim2FromOffset(12, 12);
      icon.Size = udim2FromOffset(30, 36);
      setIcon(icon, 'file', 'only');
      const title = label(card, '', 28, 14);
      title.Name = 'Project title';
      title.Position = udim2FromOffset(52, 16);
      title.FontWeight = 500;
      title.ClipsDescendants = true;
      const size = label(card, '', 28, 12, colors.muted);
      size.Name = 'Project size';
      size.Position = udim2(1, -340, 0, 16);
      size.Size = udim2FromOffset(140, 28);
      const date = label(card, '', 28, 12, colors.muted);
      date.Name = 'Project date';
      date.Position = udim2(1, -190, 0, 16);
      date.Size = udim2FromOffset(140, 28);
      const enter = button(card, 'Open project', () => open(project.id));
      enter.Text = '';
      enter.BackgroundTransparency = 1;
      enter.Size = udim2(1, 0, 1, 0);
      const more = iconButton(card, 'more', 'Project options', () => {});
      more.Position = udim2(1, -44, 0, 14);
      more.BackgroundTransparency = 1;
      const menu = panel('Project options', app);
      menu.Size = udim2FromOffset(220, 166);
      round(menu, 8, true);
      const options = [
        button(
          menu,
          'Rename project',
          () => {
            menuBinding.close();
            manage(project.id, 'rename', more);
          },
          204,
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
          204,
        ),
        button(
          menu,
          'Download project backup',
          () => {
            menuBinding.close();
            perform(() => {
              const current = library.state.get().find((entry) => entry.id === project.id);

              if (current) {
                downloadProject(current.document);
              }
            });
          },
          204,
        ),
        button(
          menu,
          'Delete project',
          () => {
            menuBinding.close();
            manage(project.id, 'delete', more);
          },
          204,
        ),
      ];
      options.forEach((option, index) => {
        option.on('click', (event) => event.stopPropagation());
        option.Position = udim2FromOffset(8, 8 + index * 38);
        option.BackgroundTransparency = 1;
        option.TextXAlignment = 'Left';
        setIcon(option, (['edit', 'copy', 'download', 'trash'] as const)[index]!);
      });
      options[3]!.TextColor3 = colors.danger;
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
      const more = children.find((child) => child.Name === 'Project options');
      const size = children.find((child) => child.Name === 'Project size');
      const date = children.find((child) => child.Name === 'Project date');
      const showMetadata = width >= 650;

      if (size?.isA('TextLabel') && date?.isA('TextLabel')) {
        size.Text = `${project.document.width} × ${project.document.height} px`;
        size.Visible = showMetadata;
        date.Text = new Date(project.updatedAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        date.Visible = showMetadata;
      }

      if (title?.isA('TextLabel') && enter?.isA('TextButton') && more?.isA('TextButton')) {
        title.Text = project.document.name;
        title.Size = udim2(1, showMetadata ? -408 : -110, 0, 28);
        title.unsafeElement.title = project.document.name;
        enter.unsafeElement.title = `Edited ${new Date(project.updatedAt).toLocaleDateString()}`;
        enter.AccessibleLabel = `Open ${project.document.name}`;
        more.AccessibleLabel = `Options for ${project.document.name}`;
      }

      card.Position = udim2FromOffset(0, index * 60);
      card.Size = udim2FromOffset(width, 60);
    },
  });

  const publish = (): void => {
    const term = search.Text.trim().toLowerCase();
    const projects = [...library.state.get()]
      .filter((project) => project.document.name.toLowerCase().includes(term))
      .sort((a, b) =>
        sortOrder === 'recent'
          ? b.updatedAt - a.updatedAt
          : a.document.name.localeCompare(b.document.name) * (sortOrder === 'name' ? 1 : -1),
      );
    source.set(projects);
    empty.Visible = projects.length === 0;
    emptyTitle.Text = library.state.get().length
      ? 'No projects found'
      : 'Create your first project';
    emptyHint.Text = library.state.get().length
      ? 'Try a different name, or clear the search to see all your projects.'
      : 'Start from a blank canvas or choose a working template.\nYour changes are saved automatically.';
    emptyAction.Text = library.state.get().length ? 'Clear search' : 'Create a project';
    emptyAction.AccessibleLabel = emptyAction.Text;
    columns.Visible = projects.length > 0;
    cards.Size = udim2FromOffset(width, projects.length ? projects.length * 60 : 270);
    content.Size = udim2FromOffset(width, cards.Position.Y.Offset + cards.Size.Y.Offset + 48);
  };

  const resize = (): void => {
    const compact = window.innerWidth < 600;
    const importErrorHeight = importStatus.Text ? 52 : 0;
    width = Math.min(1120, Math.max(240, window.innerWidth - (compact ? 32 : 96)));
    content.Position = udim2FromOffset((window.innerWidth - width) / 2, 0);
    greeting.TextSize = compact ? 26 : 30;
    brand.Visible = !compact;
    brandHint.Visible = !compact;
    newProject.Position = udim2(1, compact ? -160 : -172, 0, 20);
    importProject.Position = udim2(1, compact ? -202 : -310, 0, 20);
    importProject.Size = udim2FromOffset(compact ? 34 : 126, 32);
    importProject.Text = compact ? '' : 'Import project';
    importProject.unsafeElement.title = 'Import project';
    setIcon(importProject, 'folder', compact ? 'only' : 'leading');
    settings.Position = udim2(1, compact ? -244 : -356, 0, 20);
    storage.Position = udim2FromOffset(0, 84);
    storage.Text = library.error.get() ?? 'Saved automatically in this browser.';
    storage.TextWrapped = true;
    storage.Size = udim2(1, 0, 0, 34);
    importStatus.Position = udim2FromOffset(0, compact ? 230 : 184);
    importStatus.Size = udim2(1, 0, 0, 48);
    search.Position = udim2FromOffset(0, 140);
    search.Size = udim2FromOffset(compact ? width : Math.min(420, width - 208), 36);
    searchIcon.Position = udim2FromOffset(0, 142);
    sort.control.Position = udim2FromOffset(compact ? 0 : width - 184, compact ? 188 : 142);
    sizeColumn.Visible = width >= 650;
    dateColumn.Visible = width >= 650;
    columns.Position = udim2FromOffset(0, (compact ? 242 : 196) + importErrorHeight);
    cards.Position = udim2FromOffset(0, (compact ? 282 : 236) + importErrorHeight);
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
    newProject: templates.open,
    close: (): void => {
      modal.close();
      templates.close();
    },
  };
};
