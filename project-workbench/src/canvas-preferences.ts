import {
  createObservableValue,
  watchOwnedValue,
  type ObservableValue,
  type ScreenGui,
} from 'framekit';

import type { SceneDocument } from './document';

/** Device previews change the editing viewport without rewriting the authored scene dimensions. */
export const devicePresets = [
  { id: 'design', label: 'Design size', width: 0, height: 0 },
  { id: 'desktop', label: 'Desktop', width: 1440, height: 900 },
  { id: 'laptop', label: 'Laptop', width: 1280, height: 800 },
  { id: 'tablet', label: 'Tablet', width: 768, height: 1024 },
  { id: 'phone', label: 'Phone', width: 390, height: 844 },
  { id: 'wide', label: 'Wide screen', width: 1920, height: 1080 },
  { id: 'custom', label: 'Custom device', width: 0, height: 0 },
] as const;

export type CanvasPreferences = Readonly<{
  grid: boolean;
  snapping: boolean;
  guides: boolean;
  precision: 0 | 1;
  uiTheme: 'light' | 'dark';
  device: (typeof devicePresets)[number]['id'];
  landscape: boolean;
  width: number;
  height: number;
}>;

const defaults: CanvasPreferences = {
  grid: true,
  snapping: true,
  guides: true,
  precision: 0,
  uiTheme: 'dark',
  device: 'design',
  landscape: false,
  width: 390,
  height: 844,
};
const settingsKey = 'framekit-workbench-settings-v1';

export const createCanvasPreferences = (owner: ScreenGui): ObservableValue<CanvasPreferences> => {
  let initial = defaults;

  try {
    const saved: unknown = JSON.parse(localStorage.getItem(settingsKey) ?? 'null');

    if (typeof saved === 'object' && saved !== null) {
      const value = saved as Record<string, unknown>;
      initial = {
        grid: typeof value.grid === 'boolean' ? value.grid : true,
        snapping: typeof value.snapping === 'boolean' ? value.snapping : true,
        guides: typeof value.guides === 'boolean' ? value.guides : true,
        precision: value.precision === 1 ? 1 : 0,
        uiTheme: value.uiTheme === 'light' ? 'light' : 'dark',
        device: devicePresets.find((preset) => preset.id === value.device)?.id ?? 'design',
        landscape: typeof value.landscape === 'boolean' ? value.landscape : false,
        width:
          typeof value.width === 'number' &&
          Number.isFinite(value.width) &&
          value.width >= 240 &&
          value.width <= 4096
            ? value.width
            : 390,
        height:
          typeof value.height === 'number' &&
          Number.isFinite(value.height) &&
          value.height >= 240 &&
          value.height <= 4096
            ? value.height
            : 844,
      };
    }
  } catch {
    /* Default preferences remain available without storage. */
  }

  const state = createObservableValue(initial);
  watchOwnedValue(owner, state, (value) => {
    try {
      localStorage.setItem(settingsKey, JSON.stringify(value));
    } catch {
      /* Settings remain active for this visit. */
    }
  });
  return state;
};

export const deviceDocument = (
  document: SceneDocument,
  preferences: CanvasPreferences,
  prefabId: string | null,
): SceneDocument => {
  if (prefabId || preferences.device === 'design') {
    return document;
  }

  const preset = devicePresets.find((preset) => preset.id === preferences.device)!;
  const width = preferences.device === 'custom' ? preferences.width : preset.width;
  const height = preferences.device === 'custom' ? preferences.height : preset.height;
  return {
    ...document,
    width: preferences.landscape ? height : width,
    height: preferences.landscape ? width : height,
  };
};
