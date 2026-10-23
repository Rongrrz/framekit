import { type ScreenGui, type ObservableValue, watchOwnedValue } from 'framekit';

import { createSampleDocument, parseDocument, type SceneDocument } from './document';
import type { Editor } from './editor';
import { defaultWorkspace, type WorkspacePreferences } from './workspace';

const documentKey = 'framekit-workbench-document-v1';
const workspaceKey = 'framekit-workbench-layout-v1';

/** Browser storage is optional; malformed saved content does not prevent the editor opening. */
export const restoreWorkbench = (): Readonly<{
  document: SceneDocument;
  workspace: WorkspacePreferences;
  message: string;
}> => {
  let document = createSampleDocument();
  let workspace = defaultWorkspace;
  let message = 'Select an object to start editing.';

  try {
    const stored = window.localStorage.getItem(documentKey);

    if (stored) {
      document = parseDocument(stored);
      message = 'Restored your local document.';
    }
  } catch {
    message =
      'Could not restore the saved document. The example is open; import a JSON file to recover.';
  }

  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(workspaceKey) ?? 'null');

    if (
      typeof stored === 'object' &&
      stored !== null &&
      'left' in stored &&
      'right' in stored &&
      'zoom' in stored &&
      'pane' in stored &&
      typeof stored.left === 'number' &&
      stored.left >= 200 &&
      stored.left <= 360 &&
      typeof stored.right === 'number' &&
      stored.right >= 260 &&
      stored.right <= 420 &&
      typeof stored.zoom === 'number' &&
      (stored.zoom === 0 || (stored.zoom >= 0.1 && stored.zoom <= 2)) &&
      (stored.pane === 'hierarchy' || stored.pane === 'canvas' || stored.pane === 'properties')
    ) {
      workspace = { left: stored.left, right: stored.right, zoom: stored.zoom, pane: stored.pane };
    }
  } catch {
    // Layout preferences can always fall back independently from the document.
  }

  return { document, workspace, message };
};

/** Native file pickers and downloads integrate at the boundary; document edits stay synchronous. */
export const bindWorkbenchFiles = (
  app: ScreenGui,
  editor: Editor,
  preferences: ObservableValue<WorkspacePreferences>,
  report: (message: string) => void,
): Readonly<{
  open(): void;
  download(text: string, extension: 'json' | 'ts'): void;
}> => {
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = '.json,application/json';
  picker.setAttribute('aria-label', 'Open Workbench JSON');
  const controller = new AbortController();
  const urls = new Set<string>();
  const timers = new Set<number>();

  picker.addEventListener(
    'change',
    async () => {
      const file = picker.files?.[0];
      picker.value = '';

      if (!file) {
        return;
      }

      try {
        if (file.size > 5_000_000) {
          throw new TypeError('Documents must be smaller than 5 MB.');
        }

        const text = await file.text();

        if (!app.isDestroyed()) {
          editor.load(text);
          report(`Opened ${file.name}.`);
        }
      } catch (error) {
        if (!app.isDestroyed()) {
          report(`Could not open file: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    },
    { signal: controller.signal },
  );

  let previous = editor.state.get().document;
  const stopSaving = editor.state.onChange((snapshot) => {
    if (snapshot.document === previous) {
      return;
    }

    previous = snapshot.document;

    try {
      window.localStorage.setItem(documentKey, JSON.stringify(snapshot.document));
      report('Saved locally in this browser.');
    } catch {
      report('Browser storage is unavailable. Save JSON to keep your changes.');
    }
  });

  watchOwnedValue(app, preferences, (value) => {
    try {
      window.localStorage.setItem(workspaceKey, JSON.stringify(value));
    } catch {
      // The current layout remains usable without persistence.
    }
  });

  app.onDestroy(() => {
    stopSaving();
    controller.abort();
    picker.remove();
    timers.forEach((timer) => window.clearTimeout(timer));
    urls.forEach((url) => URL.revokeObjectURL(url));
  });

  return {
    open: (): void => picker.click(),
    download: (text, extension): void => {
      const url = URL.createObjectURL(
        new Blob([text], { type: extension === 'json' ? 'application/json' : 'text/typescript' }),
      );
      urls.add(url);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${
        editor.state
          .get()
          .document.name.replace(/[^\p{L}\p{N}_-]+/gu, '-')
          .slice(0, 80) || 'framekit-scene'
      }.${extension}`;
      anchor.click();
      const timer = window.setTimeout(() => {
        URL.revokeObjectURL(url);
        urls.delete(url);
        timers.delete(timer);
      }, 1000);
      timers.add(timer);
      report(`Downloaded ${extension.toUpperCase()}.`);
    },
  };
};
