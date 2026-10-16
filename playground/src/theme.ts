import {
  watchOwnedValue,
  type Color3,
  color3FromRGB,
  type Instance,
  type InstanceProperties,
  type ObservableValue,
} from 'framekit';

export type ThemeMode = 'dark' | 'light';

export type ThemePalette = Readonly<{
  canvas: Color3;
  surface: Color3;
  surfaceRaised: Color3;
  border: Color3;
  text: Color3;
  textMuted: Color3;
  textFaint: Color3;
  accent: Color3;
  accentMuted: Color3;
  onAccent: Color3;
  blue: Color3;
  purple: Color3;
  orange: Color3;
}>;

export type ThemeToken = keyof ThemePalette;

export type ThemeValue = ObservableValue<ThemePalette>;

export const themes = {
  dark: {
    canvas: color3FromRGB(10, 13, 18),
    surface: color3FromRGB(17, 22, 29),
    surfaceRaised: color3FromRGB(23, 30, 39),
    border: color3FromRGB(48, 61, 76),
    text: color3FromRGB(244, 247, 250),
    textMuted: color3FromRGB(165, 177, 190),
    textFaint: color3FromRGB(105, 120, 137),
    accent: color3FromRGB(118, 237, 173),
    accentMuted: color3FromRGB(36, 87, 62),
    onAccent: color3FromRGB(7, 22, 14),
    blue: color3FromRGB(112, 178, 255),
    purple: color3FromRGB(175, 142, 255),
    orange: color3FromRGB(255, 183, 94),
  },
  light: {
    canvas: color3FromRGB(245, 247, 250),
    surface: color3FromRGB(255, 255, 255),
    surfaceRaised: color3FromRGB(249, 251, 253),
    border: color3FromRGB(207, 216, 226),
    text: color3FromRGB(20, 27, 35),
    textMuted: color3FromRGB(76, 91, 107),
    textFaint: color3FromRGB(121, 136, 151),
    accent: color3FromRGB(18, 153, 98),
    accentMuted: color3FromRGB(210, 241, 225),
    onAccent: color3FromRGB(255, 255, 255),
    blue: color3FromRGB(33, 111, 203),
    purple: color3FromRGB(111, 72, 191),
    orange: color3FromRGB(183, 101, 8),
  },
} satisfies Readonly<Record<ThemeMode, ThemePalette>>;

export const fonts = {
  sans: '"Avenir Next", Avenir, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  display:
    '"Avenir Next", Avenir, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
} as const;

/** The shared type scale keeps navigation, prose, headings, and code visually related. */
export const typeScale = {
  code: 12,
  caption: 12,
  small: 14,
  body: 16,
  lead: 18,
  subsection: 20,
  section: 28,
  page: 42,
  hero: 56,
  product: 72,
} as const;

export const scrollbarThickness = 12;

const themeStorageKey = 'framekit-playground-theme';

const documentThemeColors = {
  dark: '#0a0d12',
  light: '#f5f7fa',
} satisfies Readonly<Record<ThemeMode, string>>;

const documentPaletteProperties = [
  '--pg-canvas',
  '--pg-border',
  '--pg-focus',
  '--pg-selection-text',
] as const;

/** Applies colors from the shared palette for the lifetime of the instance. */
export const bindThemeColors = <Properties extends InstanceProperties>(
  instance: Instance<Properties>,
  theme: ThemeValue,
  derive: (palette: ThemePalette) => Partial<Properties>,
): void => {
  watchOwnedValue(instance, theme, (palette) => instance.setProperties(derive(palette)));
};

export const themeColor = (theme: ThemeValue, token: ThemeToken): Color3 => theme.get()[token];

/** Applies the selected palette synchronously so all theme consumers switch together. */
export const bindThemePalette = (
  owner: Instance,
  mode: ObservableValue<ThemeMode>,
  palette: ThemeValue,
): void => {
  watchOwnedValue(owner, mode, (nextMode) => {
    palette.set(themes[nextMode]);
  });
  watchOwnedValue(owner, palette, applyDocumentPalette);
  owner.onDestroy(() => {
    for (const property of documentPaletteProperties) {
      document.documentElement.style.removeProperty(property);
    }
  });
};

export const resolveInitialTheme = (): ThemeMode => {
  try {
    const stored = window.localStorage.getItem(themeStorageKey);

    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
  } catch {
    // Storage can be unavailable in embedded previews. The system preference is still useful.
  }

  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
};

/** Keeps DOM-only styling and persistence synchronized with the FrameKit theme value. */
export const bindDocumentTheme = (owner: Instance, theme: ObservableValue<ThemeMode>): void => {
  const root = document.documentElement;
  const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const previousTheme = root.getAttribute('data-framekit-theme');
  const previousThemeColor = themeColorMeta?.content;

  watchOwnedValue(owner, theme, (mode) => {
    root.setAttribute('data-framekit-theme', mode);

    if (themeColorMeta) {
      themeColorMeta.content = documentThemeColors[mode];
    }

    try {
      window.localStorage.setItem(themeStorageKey, mode);
    } catch {
      // Theme switching remains functional when storage is unavailable.
    }
  });

  owner.onDestroy(() => {
    if (previousTheme === null) {
      root.removeAttribute('data-framekit-theme');
    } else {
      root.setAttribute('data-framekit-theme', previousTheme);
    }

    if (themeColorMeta && previousThemeColor !== undefined) {
      themeColorMeta.content = previousThemeColor;
    }
  });
};

const applyDocumentPalette = (palette: ThemePalette): void => {
  const root = document.documentElement.style;
  root.setProperty('--pg-canvas', colorToCss(palette.canvas));
  root.setProperty('--pg-border', colorToCss(palette.border));
  root.setProperty('--pg-focus', colorToCss(palette.accent));
  root.setProperty('--pg-selection-text', colorToCss(palette.onAccent));
};

const colorToCss = (color: Color3, alpha = 1): string =>
  `rgb(${color.R} ${color.G} ${color.B} / ${alpha})`;

/** Installs the DOM styling needed for fonts, scrollbars, and focus states. */
export const installPlaygroundStyles = (): void => {
  if (document.querySelector('[data-framekit-playground-styles]')) {
    return;
  }

  const style = document.createElement('style');
  style.dataset.framekitPlaygroundStyles = '';
  style.textContent = `
    :root {
      color-scheme: dark;
      font-synthesis: none;
      --pg-canvas: #0a0d12;
      --pg-border: rgb(48 61 76);
      --pg-focus: #76edad;
    }
    :root[data-framekit-theme="light"] {
      color-scheme: light;
      --pg-canvas: #f5f7fa;
      --pg-border: rgb(207 216 226);
      --pg-focus: #129962;
    }
    * { box-sizing: border-box; }
    html, body, #root {
      width: 100%; height: 100%; margin: 0; overflow: hidden; background: var(--pg-canvas);
    }
    body { font-family: ${fonts.sans}; }
    ::selection { color: var(--pg-selection-text); background: var(--pg-focus); }
    @media (prefers-reduced-motion: reduce) {
      * { animation-duration: .001ms !important; animation-iteration-count: 1 !important; }
    }
  `;
  document.head.append(style);
};
