import {
  createComputedValue,
  watchOwnedValue,
  type Color3,
  type Instance,
  type ObservableValue,
  type ReadonlyObservableValue,
  type ScreenGui,
} from 'framekit';

import type { CanvasPreferences } from './canvas-preferences';
import { colors, lightColors } from './palette';

const themes = new WeakMap<Instance, ReadonlyObservableValue<'light' | 'dark'>>();
const registered = new WeakSet<Instance>();
const pairs = Object.keys(colors).map((key) => ({
  dark: colors[key as keyof typeof colors],
  light: lightColors[key as keyof typeof colors],
}));
const sameColor = (a: Color3, b: Color3): boolean => a.R === b.R && a.G === b.G && a.B === b.B;
type ColorProperty = 'BackgroundColor3' | 'TextColor3' | 'Color' | 'ScrollBarImageColor3';

const hasColorProperty = <Key extends ColorProperty>(
  node: Instance,
  key: Key,
): node is Instance<{ Name: string } & Record<Key, Color3>> => Object.hasOwn(node, key);

/** Each application owns its theme; scene factories do not register as chrome. */
export const bindChromeTheme = (
  app: ScreenGui,
  preferences: ObservableValue<CanvasPreferences>,
): void => {
  const theme = createComputedValue([preferences], () => preferences.get().uiTheme);
  themes.set(app, theme);
  app.onDestroy(() => themes.delete(app));
  watchOwnedValue(app, theme, (value) => {
    app.ColorScheme = value === 'light' ? 'Light' : 'Dark';
    app.unsafeElement.dataset.workbenchTheme = value;
  });
};

/** Apply palette tokens through public properties, including later selection and status changes. */
export const themeChromeNode = <T extends Instance>(node: T): T => {
  if (registered.has(node)) {
    return node;
  }
  registered.add(node);

  // Keyed children and modifiers acquire their owner after their factory returns.
  queueMicrotask(() => {
    if (node.isDestroyed() || node.Name === 'Color swatch') {
      return;
    }
    let root: Instance = node;
    while (root.Parent) {
      root = root.Parent;
    }
    const theme = themes.get(root);
    if (!theme) {
      return;
    }

    for (const key of [
      'BackgroundColor3',
      'TextColor3',
      'Color',
      'ScrollBarImageColor3',
    ] as const) {
      if (!hasColorProperty(node, key)) {
        continue;
      }
      const target = node;
      const paint = (value: Color3): void => {
        const pair = pairs.find(
          (entry) => sameColor(value, entry.dark) || sameColor(value, entry.light),
        );
        const next = pair?.[theme.get()];
        if (next && !sameColor(value, next)) {
          target[key] = next;
        }
      };
      target.onPropertyChanged(key, paint);
      watchOwnedValue(node, theme, () => paint(target[key]));
    }
  });
  return node;
};
