import { type ScreenGui, type ObservableValue, watchOwnedValue } from 'framekit';

import type { SceneDocument } from './document';
import {
  canvasZoomLimits,
  defaultWorkspace,
  panelWidthLimits,
  type WorkspacePreferences,
} from './workspace';

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
      stored.left >= panelWidthLimits.left.min &&
      stored.left <= panelWidthLimits.left.max &&
      typeof stored.right === 'number' &&
      stored.right >= panelWidthLimits.right.min &&
      stored.right <= panelWidthLimits.right.max &&
      typeof stored.zoom === 'number' &&
      (stored.zoom === 0 ||
        (stored.zoom >= canvasZoomLimits.min && stored.zoom <= canvasZoomLimits.max)) &&
      (stored.pane === 'hierarchy' || stored.pane === 'canvas' || stored.pane === 'properties')
    ) {
      workspace = { left: stored.left, right: stored.right, zoom: stored.zoom, pane: stored.pane };
    }
  } catch {
    // Layout preferences can always fall back independently from the document.
  }

  return workspace;
};

/** Downloads and their temporary URLs belong to the application lifetime. */
export const bindWorkbenchFiles = (
  app: ScreenGui,
  preferences: ObservableValue<WorkspacePreferences>,
  report: (message: string) => void,
): Readonly<{
  download(name: string, data: BlobPart, mime: string): void;
  downloadProject(document: SceneDocument): void;
}> => {
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

  const download = (name: string, data: BlobPart, mime: string): void => {
    const url = URL.createObjectURL(new Blob([data], { type: mime }));
    urls.add(url);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(url);
      urls.delete(url);
      timers.delete(timer);
    }, 1000);
    timers.add(timer);
    report(`Downloaded ${name}.`);
  };

  return {
    download,
    downloadProject: (document): void => {
      const name = document.name
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
      download(
        `${name || 'project'}.framekit.json`,
        JSON.stringify(document, null, 2),
        'application/json',
      );
    },
  };
};
