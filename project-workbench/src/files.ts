import { type ScreenGui, type ObservableValue, watchOwnedValue } from 'framekit';

import type { Editor } from './editor';
import { defaultWorkspace, type WorkspacePreferences } from './workspace';

const workspaceKey = 'framekit-workbench-layout-v1';

/** Layout can fall back independently from saved projects. */
export const restoreWorkspace = (): WorkspacePreferences => {
  let workspace = defaultWorkspace;

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

  return workspace;
};

/** Downloads are source code; project documents stay in the browser library. */
export const bindWorkbenchFiles = (
  app: ScreenGui,
  editor: Editor,
  preferences: ObservableValue<WorkspacePreferences>,
  report: (message: string) => void,
): Readonly<{ download(text: string, extension: 'ts'): void }> => {
  const urls = new Set<string>();
  const timers = new Set<number>();

  watchOwnedValue(app, preferences, (value) => {
    try {
      window.localStorage.setItem(workspaceKey, JSON.stringify(value));
    } catch {
      // Layout remains usable without persistence.
    }
  });

  app.onDestroy(() => {
    timers.forEach((timer) => window.clearTimeout(timer));
    urls.forEach((url) => URL.revokeObjectURL(url));
  });

  return {
    download: (text): void => {
      const url = URL.createObjectURL(new Blob([text], { type: 'text/typescript' }));
      urls.add(url);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${
        editor.state
          .get()
          .document.name.replace(/[^\p{L}\p{N}_-]+/gu, '-')
          .slice(0, 80) || 'framekit-scene'
      }.ts`;
      anchor.click();
      const timer = window.setTimeout(() => {
        URL.revokeObjectURL(url);
        urls.delete(url);
        timers.delete(timer);
      }, 1000);
      timers.add(timer);
      report('Downloaded TypeScript.');
    },
  };
};
