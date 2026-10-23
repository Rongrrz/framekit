import {
  bindDialog,
  bindKeyedChildren,
  bindMenu,
  color3FromHex,
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
import type { ProjectLibrary, SavedProject } from './projects';
import { projectTemplates } from './templates';
import { button, colors, font, input, label, panel, round, scroll, stack } from './ui';

/** Compact previews use a handful of shapes rather than mounting every project's live scene. */
const thumbnail = (parent: Frame, kind: string, accent: string): void => {
  const surface = panel('Project thumbnail', parent, color3FromHex('#141820'));
  surface.Position = udim2FromOffset(12, 12);
  surface.Size = udim2(1, -24, 0, 92);
  surface.ClipsDescendants = true;
  round(surface, 7);
  const tint = color3FromHex(accent);

  if (kind === 'blank') {
    const plus = label(surface, '+', 64, 32, tint);
    plus.Position = udim2FromOffset(0, 12);
    plus.TextXAlignment = 'Center';
    surface.unsafeElement.dataset.workbenchGrid = '';
    return;
  }

  const sheet = panel(
    'Preview sheet',
    surface,
    kind === 'dashboard' ? colors.raised : color3FromHex('#f4f5ee'),
  );
  sheet.Position = udim2(0.12, 0, 0, 12);
  sheet.Size = udim2(0.76, 0, 0, 76);
  round(sheet, 5);

  if (kind === 'dashboard') {
    const sidebar = panel('Preview navigation', sheet, tint);
    sidebar.Size = udim2(0.18, 0, 1, 0);
    sidebar.BackgroundTransparency = 0.55;
  }

  const x = kind === 'dashboard' ? 0.25 : 0.1;
  const title = panel('Preview title', sheet, kind === 'dashboard' ? tint : colors.border);
  title.Position = udim2(x, 0, 0, 12);
  title.Size = udim2(0.42, 0, 0, 5);
  round(title, 2);
  const subtitle = panel('Preview subtitle', sheet, color3FromHex('#a1a4b1'));
  subtitle.Position = udim2(x, 0, 0, 23);
  subtitle.Size = udim2(0.56, 0, 0, 3);
  round(subtitle, 2);

  for (let index = 0; index < (kind === 'dashboard' ? 3 : 1); index++) {
    const block = panel('Preview content', sheet, tint);
    block.Position = udim2(x + index * 0.22, 0, 0, 38);
    block.Size = udim2(kind === 'dashboard' ? 0.18 : 0.8, 0, 0, kind === 'settings' ? 10 : 22);
    round(block, 3);
  }
};

/** The home screen owns project discovery and management; opening a project belongs to the app. */
export const createProjectHome = (
  app: ScreenGui,
  library: ProjectLibrary,
  open: (id: string) => void,
  create: (document: SceneDocument) => void,
  perform: (action: () => void) => void,
): Readonly<{ view: Frame; close(): void }> => {
  const home = panel('Projects home', app, colors.canvas);
  setAccessibility(home, { role: 'region', label: 'Projects home' });
  const header = panel('Projects header', home);
  header.Size = udim2(1, 0, 0, 72);
  const brand = label(header, '◈  FRAMEKIT', 40, 15, colors.accent);
  brand.FontWeight = 700;
  brand.LetterSpacing = 2;
  brand.Position = udim2FromOffset(28, 16);
  brand.Size = udim2FromOffset(190, 40);
  const newProject = button(
    header,
    '+ New project',
    () => {
      viewport.CanvasPosition = vector2(0, 0);
      templates[0]!.focus();
    },
    144,
  );
  newProject.Position = udim2(1, -172, 0, 20);
  newProject.BackgroundColor3 = colors.accent;
  newProject.TextColor3 = colors.canvas;
  const viewport = scroll(home, 'Projects');
  viewport.Position = udim2FromOffset(0, 73);
  viewport.Size = udim2(1, 0, 1, -73);
  const content = panel('Project library', viewport, colors.canvas);
  const greeting = label(content, 'A place for your next idea.', 58, 32);
  greeting.FontWeight = 650;
  greeting.Position = udim2FromOffset(0, 28);
  const intro = label(
    content,
    'Start with a template, or pick up where you left off.',
    30,
    14,
    colors.muted,
  );
  intro.Position = udim2FromOffset(0, 86);
  const templatesHeading = label(content, 'START SOMETHING NEW', 30, 10, colors.muted);
  templatesHeading.LetterSpacing = 1.5;
  templatesHeading.Position = udim2FromOffset(0, 138);
  const templates = projectTemplates.map((template) => {
    const card = panel(template.name, content, colors.panel);
    round(card, 12, true);
    thumbnail(card, template.kind, template.accent);
    const title = label(card, template.name, 28, 14);
    title.Position = udim2FromOffset(16, 112);
    title.Size = udim2(1, -32, 0, 28);
    title.FontWeight = 600;
    const description = label(card, template.description, 34, 11, colors.muted);
    description.Position = udim2FromOffset(16, 142);
    description.Size = udim2(1, -32, 0, 34);
    description.TextWrapped = true;
    const choose = button(card, `Create ${template.name}`, () =>
      perform(() => create(template.create())),
    );
    choose.Position = udim2FromOffset(0, 0);
    choose.Size = udim2(1, 0, 1, 0);
    choose.BackgroundTransparency = 1;
    choose.Text = '';
    choose.unsafeElement.title = template.description;
    card.unsafeElement.dataset.projectCard = '';
    return choose;
  });
  const recentHeading = label(content, 'Your projects', 40, 22);
  recentHeading.FontWeight = 600;
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
  const empty = label(cards, '', 64, 14, colors.muted);
  empty.TextWrapped = true;
  const source = createObservableValue<readonly SavedProject[]>([]);
  let alphabetical = false;
  let columns = 4;
  let width = 1200;
  let recentTop = 420;

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
      round(card, 12, true);
      const kind =
        project.document.nodes.length === 0
          ? 'blank'
          : project.document.nodes.some((node) => node.id === 'sidebar')
            ? 'dashboard'
            : project.document.nodes.some((node) => node.type === 'TextInput')
              ? 'settings'
              : 'welcome';
      thumbnail(card, kind, kind === 'dashboard' ? '#a5baff' : '#aff1d1');
      const title = label(card, '', 28, 14);
      title.Name = 'Project title';
      title.Position = udim2FromOffset(16, 112);
      title.Size = udim2(1, -54, 0, 28);
      title.FontWeight = 600;
      const details = label(card, '', 24, 11, colors.muted);
      details.Name = 'Project details';
      details.Position = udim2FromOffset(16, 143);
      details.Size = udim2(1, -32, 0, 24);
      const enter = button(card, 'Open project', () => open(project.id));
      enter.Text = '';
      enter.BackgroundTransparency = 1;
      enter.Size = udim2(1, 0, 1, 0);
      const more = button(card, '•••', () => {}, 32);
      more.AccessibleLabel = `Project options ${project.id}`;
      more.Position = udim2(1, -44, 0, 111);
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
      card.unsafeElement.dataset.projectCard = '';
      return card;
    },
    update: (card, project, index) => {
      const children = card.getChildren();
      const title = children.find((child) => child.Name === 'Project title');
      const details = children.find((child) => child.Name === 'Project details');
      const enter = children.find((child) => child.Name === 'Open project');
      const more = children.find((child) => child.Name === '•••');

      if (
        title?.isA('TextLabel') &&
        details?.isA('TextLabel') &&
        enter?.isA('TextButton') &&
        more?.isA('TextButton')
      ) {
        title.Text = project.document.name;
        details.Text = `${project.document.width} × ${project.document.height}  ·  ${new Date(project.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        enter.AccessibleLabel = `Open ${project.document.name}`;
        more.AccessibleLabel = `Options for ${project.document.name}`;
      }

      card.Position = udim2FromOffset(
        (index % columns) * ((width + 16) / columns),
        Math.floor(index / columns) * 198,
      );
      card.Size = udim2FromOffset((width - (columns - 1) * 16) / columns, 182);
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
      : 'Your projects will live here. Choose a template above to make your first one.';
    cards.Size = udim2FromOffset(width, Math.max(80, Math.ceil(projects.length / columns) * 198));
    content.Size = udim2FromOffset(
      width,
      recentTop + 152 + Math.max(120, Math.ceil(projects.length / columns) * 198),
    );
  };

  const resize = (): void => {
    width = Math.min(1200, Math.max(240, window.innerWidth - (window.innerWidth < 600 ? 32 : 96)));
    columns = Math.max(1, Math.min(4, Math.floor((width + 16) / 250)));
    content.Position = udim2FromOffset((window.innerWidth - width) / 2, 0);
    greeting.TextSize = window.innerWidth < 600 ? 25 : 32;
    templates.forEach((choose, index) => {
      const card = choose.Parent;

      if (card?.isA('Frame')) {
        card.Position = udim2FromOffset(
          (index % columns) * ((width + 16) / columns),
          180 + Math.floor(index / columns) * 202,
        );
        card.Size = udim2FromOffset((width - (columns - 1) * 16) / columns, 186);
      }
    });
    recentTop = 196 + Math.ceil(templates.length / columns) * 202;
    recentHeading.Position = udim2FromOffset(0, recentTop);
    storage.Position = udim2FromOffset(0, recentTop + 40);
    storage.Text = library.error.get() ?? 'Saved automatically in this browser.';
    storage.TextWrapped = true;
    storage.Size = udim2(1, 0, 0, 34);
    search.Position = udim2FromOffset(0, recentTop + 84);
    search.Size = udim2FromOffset(Math.max(100, width - 174), 32);
    sort.Position = udim2FromOffset(width - 158, recentTop + 84);
    cards.Position = udim2FromOffset(0, recentTop + 136);
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
  return { view: home, close: (): void => modal.close() };
};
