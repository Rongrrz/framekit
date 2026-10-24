import {
  bindDialog,
  bindKeyedChildren,
  bindTreeView,
  color3FromHex,
  createFrame,
  createObservableValue,
  createScrollingFrame,
  createTextLabel,
  createUIPadding,
  escapeRichText,
  setAccessibility,
  udim,
  udim2,
  udim2FromOffset,
  vector2,
  watchOwnedValue,
  type Frame,
  type GuiElement,
  type ScreenGui,
  type TreeViewItem,
} from 'framekit';

import { codeThemes, type CodeResponse, type CodeTheme, type PreparedCode } from './code-themes';
import type { Editor } from './editor';
import { exportProject, type ProjectFile } from './project-export';
import { decorateTreeRow } from './tree-appearance';
import { button, colors, label, mono, panel, round, scroll } from './ui';
import { zipProject } from './zip';

const themeStorageKey = 'framekit-workbench-code-theme';
const restoreTheme = (): CodeTheme => {
  try {
    return (
      codeThemes.find((theme) => theme.id === localStorage.getItem(themeStorageKey))?.id ??
      'github-dark'
    );
  } catch {
    return 'github-dark';
  }
};

type ExportSession = Readonly<{
  files: readonly ProjectFile[];
  name: string;
  prepared: Map<string, Promise<PreparedCode>>;
}>;

type FileRow = Readonly<{ path: string; name: string; depth: number; folder: boolean }>;

/** A file explorer and worker-backed source viewer share the exact bytes downloaded in the ZIP. */
export const createCodeDialog = (
  app: ScreenGui,
  editor: Editor,
  download: (name: string, data: BlobPart, mime: string) => void,
  report: (message: string) => void,
): Readonly<{
  open(opener?: GuiElement): void;
  close(): void;
  getTheme(): CodeTheme;
  setTheme(theme: CodeTheme): void;
}> => {
  const dialog = createFrame({
    TagName: 'dialog',
    Name: 'Project export',
    Position: udim2(0.5, 0, 0.5, 0),
    AnchorPoint: vector2(0.5, 0.5),
    BackgroundColor3: colors.panel,
  });
  dialog.Parent = app;
  round(dialog, 16, true);
  setAccessibility(dialog, { label: 'Export project' });
  const heading = label(dialog, 'Export project', 36, 23);
  heading.FontWeight = 600;
  heading.Position = udim2FromOffset(28, 20);
  heading.Size = udim2(1, -96, 0, 36);
  const description = label(
    dialog,
    'Download a runnable project. Source files remain available here for debugging.',
    24,
    12,
    colors.muted,
  );
  description.Position = udim2FromOffset(28, 58);
  description.Size = udim2(1, -56, 0, 24);
  const close = button(dialog, '×', () => modal.close(), 34);
  close.AccessibleLabel = 'Close export';
  close.Position = udim2(1, -54, 0, 22);
  const browser = scroll(dialog, 'Project files');
  browser.Position = udim2FromOffset(20, 104);
  browser.BackgroundTransparency = 0;
  browser.BackgroundColor3 = colors.field;
  round(browser, 10, true);
  setAccessibility(browser, { label: 'Project files' });
  const frame = panel('Source preview', dialog, colors.field);
  frame.ClipsDescendants = true;
  round(frame, 10, true);
  const filebar = panel('Source toolbar', frame, colors.raised);
  const filename = label(filebar, '', 48, 11);
  filename.Position = udim2FromOffset(12, 0);
  filename.Size = udim2(1, -24, 0, 48);
  filename.FontFamily = mono;
  filename.ClipsDescendants = true;
  const viewport = createScrollingFrame({
    Name: 'Generated TypeScript',
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
    Position: udim2FromOffset(12, 20),
    Size: udim2FromOffset(36, 0),
    AutomaticSize: 'Y',
    TextSize: 12,
    LineHeight: 2,
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
    Position: udim2FromOffset(64, 20),
    AutomaticSize: 'XY',
    TextSize: 13,
    LineHeight: 24 / 13,
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
  const summary = label(dialog, 'Preparing project…', 22, 11, colors.muted);
  summary.Position = udim2(0, 28, 1, -80);
  summary.Size = udim2(1, -56, 0, 22);
  summary.ClipsDescendants = true;
  let session: ExportSession | undefined;
  let selectedPath = 'src/scene.ts';
  let theme = restoreTheme();
  let prepared: PreparedCode | undefined;
  let worker: Worker | undefined;
  let requestId = 0;
  let selectionRevision = 0;
  let generation = 0;
  let showFiles = false;
  let packing = false;
  const pending = new Map<
    number,
    Readonly<{ resolve(value: PreparedCode): void; reject(error: Error): void }>
  >();
  const collapsed = new Set<string>(['framekit']);
  const rows = createObservableValue<readonly FileRow[]>([]);
  const treeRows = createObservableValue<readonly TreeViewItem[]>([]);
  const rowViews = new Map<string, Frame>();

  const selectedFile = (): ProjectFile | undefined =>
    session?.files.find((file) => file.path === selectedPath);
  const extension = (): string => selectedPath.split('.').at(-1) ?? 'txt';
  const fileDownload = button(
    dialog,
    'Download .ts',
    () => {
      const file = selectedFile();

      if (file && prepared) {
        download(
          file.path.split('/').at(-1)!,
          prepared.source,
          file.language === 'typescript' ? 'text/typescript' : 'text/plain',
        );
      }
    },
    140,
  );
  const copy = button(
    dialog,
    'Copy code',
    () => {
      if (!prepared || !navigator.clipboard) {
        summary.Text = 'Clipboard unavailable. Select source or download the file.';
        return;
      }

      navigator.clipboard
        .writeText(prepared.source)
        .then(() => {
          if (!dialog.isDestroyed()) {
            copy.Text = '✓ Copied';
          }
        })
        .catch(() => {
          if (!dialog.isDestroyed()) {
            summary.Text = 'Clipboard unavailable. Select source or download the file.';
          }
        });
    },
    118,
  );

  const zip = button(
    dialog,
    'Download ZIP',
    () => {
      const current = session;

      if (!current || packing) {
        return;
      }

      packing = true;
      zip.Disabled = true;
      summary.Text = 'Formatting project files and preparing ZIP…';
      void Promise.all(
        current.files.map(async (file): Promise<ProjectFile> => {
          const cached = current.prepared.get(file.path);
          const source =
            file.path.startsWith('framekit/') && !cached
              ? file.source
              : (await prepareFile(current, file)).source;
          return { ...file, source };
        }),
      )
        .then((files) => {
          if (!dialog.isDestroyed() && session === current) {
            download(
              `${current.name.replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 80) || 'framekit-project'}.zip`,
              zipProject(files),
              'application/zip',
            );
            summary.Text = `${files.length} files · Unzip, then npm install and npm run dev`;
          }
        })
        .catch((error: unknown) => {
          if (!dialog.isDestroyed() && session === current) {
            summary.Text = `Export failed: ${error instanceof Error ? error.message : String(error)}`;
          }
        })
        .finally(() => {
          packing = false;
          if (!dialog.isDestroyed()) {
            zip.Disabled = !session;
          }
        });
    },
    140,
  );
  zip.BackgroundColor3 = colors.accent;
  zip.TextColor3 = colors.canvas;
  const filesToggle = button(
    dialog,
    'Files',
    () => {
      showFiles = !showFiles;
      resize();
    },
    72,
  );
  filesToggle.AccessibleLabel = 'Browse project files';
  filesToggle.Position = udim2FromOffset(28, 62);
  const modal = bindDialog(dialog, { initialFocus: viewport });

  const applyTheme = (): void => {
    const palette = prepared?.palettes[theme];

    if (palette) {
      content.RichText = true;
      content.Text = palette.text;
      content.TextColor3 = color3FromHex(palette.foreground);
      viewport.BackgroundColor3 = color3FromHex(palette.background);
      gutter.TextColor3 = color3FromHex(palette.muted);
    }
  };
  const setTheme = (value: CodeTheme): void => {
    theme = value;
    applyTheme();

    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch {
      /* Theme remains available in memory. */
    }
  };
  const fallback = (file: ProjectFile): PreparedCode => ({
    source: file.source,
    palettes: {
      'github-dark': {
        text: escapeRichText(file.source.trimEnd()),
        foreground: '#e6edf3',
        background: '#0d1117',
        muted: '#6e7681',
      },
      'github-light': {
        text: escapeRichText(file.source.trimEnd()),
        foreground: '#1f2328',
        background: '#ffffff',
        muted: '#8c959f',
      },
    },
  });
  const failWorker = (): void => {
    worker?.terminate();
    worker = undefined;
    for (const request of pending.values()) {
      request.reject(new Error('Formatting worker unavailable.'));
    }
    pending.clear();
  };
  const prepareFile = (current: ExportSession, file: ProjectFile): Promise<PreparedCode> => {
    const cached = current.prepared.get(file.path);

    if (cached) {
      return cached;
    }

    const task = new Promise<PreparedCode>((resolve, reject) => {
      try {
        if (!worker) {
          worker = new Worker(new URL('./code-worker.ts', import.meta.url), { type: 'module' });
          worker.onmessage = (event: MessageEvent<CodeResponse>): void => {
            const request = pending.get(event.data.id);
            pending.delete(event.data.id);
            if ('error' in event.data) {
              request?.reject(new Error(event.data.error));
            } else {
              request?.resolve(event.data.result);
            }
          };
          worker.onerror = failWorker;
        }

        requestId += 1;
        pending.set(requestId, { resolve, reject });
        worker.postMessage({ id: requestId, source: file.source, language: file.language });
      } catch (error) {
        reject(error);
      }
    }).catch(() => fallback(file));
    current.prepared.set(file.path, task);
    return task;
  };

  const publishFiles = (): void => {
    const paths = new Map<string, FileRow>();

    for (const file of session?.files ?? []) {
      const parts = file.path.split('/');
      parts.forEach((name, index) => {
        const path = parts.slice(0, index + 1).join('/');
        paths.set(path, { path, name, depth: index + 1, folder: index < parts.length - 1 });
      });
    }

    const ordered: FileRow[] = [];
    const visit = (prefix: string, depth: number): void => {
      const children = [...paths.values()].filter(
        (row) =>
          row.depth === depth &&
          row.path.slice(0, Math.max(0, row.path.lastIndexOf('/'))) === prefix,
      );
      children.sort((a, b) =>
        a.path === 'framekit'
          ? 1
          : b.path === 'framekit'
            ? -1
            : Number(b.folder) - Number(a.folder) || a.name.localeCompare(b.name),
      );
      for (const row of children) {
        ordered.push(row);
        if (row.folder && !collapsed.has(row.path)) {
          visit(row.path, depth + 1);
        }
      }
    };
    visit('', 1);
    rows.set(ordered);
  };
  const selectFile = (path: string): void => {
    const current = session;
    const file = current?.files.find((file) => file.path === path);

    if (!current || !file) {
      return;
    }

    selectedPath = path;
    showFiles = false;
    selectionRevision += 1;
    const revision = selectionRevision;
    prepared = undefined;
    content.RichText = false;
    content.Text = 'Preparing source…';
    gutter.Text = '';
    filename.Text = file.path;
    copy.Text = 'Copy code';
    copy.Disabled = true;
    fileDownload.Disabled = true;
    fileDownload.AccessibleLabel = `Download .${extension()}`;
    publishFiles();
    resize();
    viewport.CanvasPosition = vector2(0, 0);
    setAccessibility(viewport, {
      role: 'region',
      label: file.language === 'typescript' ? 'Generated TypeScript' : `Generated ${file.language}`,
      focusable: true,
    });
    void prepareFile(current, file).then((result) => {
      if (dialog.isDestroyed() || revision !== selectionRevision) {
        return;
      }

      prepared = result;
      const lines = result.source.trimEnd().split('\n');
      gutter.Text = lines.map((_, index) => String(index + 1)).join('\n');
      summary.Text = `${current.files.length} project files · ${lines.length} lines · ${file.language}`;
      copy.Disabled = false;
      fileDownload.Disabled = false;
      applyTheme();
    });
  };
  bindKeyedChildren(browser, rows, {
    key: (row) => row.path,
    create: (row) => {
      const control = button(browser, '', () => {}, 100);
      control.Parent = undefined;
      control.TextXAlignment = 'Left';
      control.TextSize = 11;
      rowViews.set(row.path, control);
      control.onDestroy(() => rowViews.delete(row.path));
      return control;
    },
    update: (control, row, index) => {
      control.Text = row.name;
      decorateTreeRow(
        control,
        row.depth,
        row.folder ? 'folder' : 'file',
        row.folder ? !collapsed.has(row.path) : undefined,
      );
      control.AccessibleLabel = row.path;
      control.Position = udim2FromOffset(6, 6 + index * 32);
      control.Size = udim2(1, -16, 0, 30);
      control.BackgroundColor3 = row.path === selectedPath ? colors.selected : colors.field;
      control.TextColor3 = row.path === selectedPath ? colors.accent : colors.muted;
    },
  });
  bindTreeView(browser, treeRows, {
    onSelect: (node) => {
      const path = [...rowViews].find(([, view]) => view === node)?.[0];
      const row = rows.get().find((row) => row.path === path);

      if (row?.folder) {
        if (collapsed.has(row.path)) {
          collapsed.delete(row.path);
        } else {
          collapsed.add(row.path);
        }
        publishFiles();
      } else if (path) {
        selectFile(path);
      }
    },
    onToggle: (node, expanded) => {
      const path = [...rowViews].find(([, view]) => view === node)?.[0];
      if (path) {
        if (expanded) {
          collapsed.delete(path);
        } else {
          collapsed.add(path);
        }
        publishFiles();
      }
    },
  });
  watchOwnedValue(dialog, rows, (rows) =>
    treeRows.set(
      rows.map((row) => ({
        node: rowViews.get(row.path)!,
        level: row.depth,
        label: row.path,
        selected: row.path === selectedPath,
        ...(row.folder ? { expanded: !collapsed.has(row.path) } : {}),
      })),
    ),
  );

  const resize = (): void => {
    const width = Math.min(1220, window.innerWidth - 32);
    const compact = width < 760;
    dialog.Size = udim2FromOffset(width, Math.min(860, window.innerHeight - 32));
    browser.Size = udim2(compact ? 1 : 0, compact ? -40 : 208, 1, -208);
    browser.Visible = !compact || showFiles;
    frame.Visible = !compact || !showFiles;
    frame.Position = udim2FromOffset(compact ? 20 : 240, 104);
    frame.Size = udim2(1, compact ? -40 : -260, 1, -208);
    filebar.Size = udim2(1, 0, 0, 48);
    viewport.Position = udim2FromOffset(0, 48);
    viewport.Size = udim2(1, 0, 1, -48);
    description.Visible = !compact;
    filesToggle.Visible = compact;
    filesToggle.Text = showFiles ? 'Code' : 'Files';
    heading.TextSize = compact ? 20 : 23;
    const buttonWidth = compact ? (width - 72) / 3 : 140;
    zip.Position = udim2(0, 28, 1, -52);
    zip.Size = udim2FromOffset(buttonWidth, 32);
    zip.Text = compact ? 'ZIP' : 'Download ZIP';
    zip.AccessibleLabel = 'Download ZIP';
    fileDownload.Position = udim2(0, 36 + buttonWidth, 1, -52);
    fileDownload.Size = udim2FromOffset(buttonWidth, 32);
    fileDownload.Text = compact ? `.${extension()}` : `Download .${extension()}`;
    fileDownload.AccessibleLabel = `Download .${extension()}`;
    copy.Position = udim2(1, -28 - buttonWidth, 1, -52);
    copy.Size = udim2FromOffset(buttonWidth, 32);
  };
  const controller = new AbortController();
  window.addEventListener('resize', resize, { signal: controller.signal });
  app.onDestroy(() => {
    controller.abort();
    selectionRevision += 1;
    generation += 1;
    failWorker();
  });
  viewport.on('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      document.getSelection()?.selectAllChildren(content.unsafeElement);
    }
  });

  return {
    close: (): void => modal.close(),
    getTheme: (): CodeTheme => theme,
    setTheme,
    open: (opener): void => {
      generation += 1;
      selectionRevision += 1;
      const currentGeneration = generation;
      session = undefined;
      selectedPath = 'src/scene.ts';
      showFiles = false;
      prepared = undefined;
      content.RichText = false;
      content.Text = 'Preparing project files…';
      gutter.Text = '';
      summary.Text = 'Collecting scene, prefabs, and the local FrameKit runtime…';
      copy.Disabled = true;
      fileDownload.Disabled = true;
      zip.Disabled = true;
      rows.set([]);
      resize();
      modal.open(opener);
      const project = editor.state.get().project;
      void exportProject(project)
        .then((files) => {
          if (dialog.isDestroyed() || generation !== currentGeneration) {
            return;
          }

          session = { files, name: project.name, prepared: new Map() };
          zip.Disabled = packing;
          selectFile('src/scene.ts');
        })
        .catch((error: unknown) => {
          if (!dialog.isDestroyed() && generation === currentGeneration) {
            summary.Text = `Could not export: ${error instanceof Error ? error.message : String(error)}`;
            report(summary.Text);
          }
        });
    },
  };
};
