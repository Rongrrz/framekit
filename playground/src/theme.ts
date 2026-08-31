import { fk, fka } from 'framekit';

export type ThemeMode = 'dark' | 'light';

export type ThemePalette = Readonly<{
  canvas: fk.Color3;
  surface: fk.Color3;
  surfaceRaised: fk.Color3;
  border: fk.Color3;
  text: fk.Color3;
  textMuted: fk.Color3;
  textFaint: fk.Color3;
  accent: fk.Color3;
  accentMuted: fk.Color3;
  onAccent: fk.Color3;
  blue: fk.Color3;
  purple: fk.Color3;
  orange: fk.Color3;
}>;

export type ThemeToken = keyof ThemePalette;
export type ThemeValue = fk.Value<ThemePalette>;

export const themes = {
  dark: {
    canvas: fk.color3FromRGB(10, 13, 18),
    surface: fk.color3FromRGB(17, 22, 29),
    surfaceRaised: fk.color3FromRGB(23, 30, 39),
    border: fk.color3FromRGB(48, 61, 76),
    text: fk.color3FromRGB(244, 247, 250),
    textMuted: fk.color3FromRGB(165, 177, 190),
    textFaint: fk.color3FromRGB(105, 120, 137),
    accent: fk.color3FromRGB(118, 237, 173),
    accentMuted: fk.color3FromRGB(36, 87, 62),
    onAccent: fk.color3FromRGB(7, 22, 14),
    blue: fk.color3FromRGB(112, 178, 255),
    purple: fk.color3FromRGB(175, 142, 255),
    orange: fk.color3FromRGB(255, 183, 94),
  },
  light: {
    canvas: fk.color3FromRGB(245, 247, 250),
    surface: fk.color3FromRGB(255, 255, 255),
    surfaceRaised: fk.color3FromRGB(249, 251, 253),
    border: fk.color3FromRGB(207, 216, 226),
    text: fk.color3FromRGB(20, 27, 35),
    textMuted: fk.color3FromRGB(76, 91, 107),
    textFaint: fk.color3FromRGB(121, 136, 151),
    accent: fk.color3FromRGB(18, 153, 98),
    accentMuted: fk.color3FromRGB(210, 241, 225),
    onAccent: fk.color3FromRGB(255, 255, 255),
    blue: fk.color3FromRGB(33, 111, 203),
    purple: fk.color3FromRGB(111, 72, 191),
    orange: fk.color3FromRGB(183, 101, 8),
  },
} satisfies Readonly<Record<ThemeMode, ThemePalette>>;

export const fonts = {
  sans: 'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  display:
    'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
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

const themeSpringOptions = {
  tension: 100,
  friction: 18,
  precision: 0.002,
  restVelocity: 0.03,
} satisfies fka.SpringOptions;

const documentPaletteProperties = [
  '--pg-canvas',
  '--pg-border',
  '--pg-grid',
  '--pg-glow',
  '--pg-scroll-track',
  '--pg-scroll-thumb',
  '--pg-scroll-hover',
  '--pg-focus',
  '--pg-selection-text',
] as const;

/** Applies colors from the shared animated palette for the lifetime of the instance. */
export const bindThemeColors = <Properties extends fk.InstanceProperties>(
  instance: fk.Instance<Properties>,
  theme: ThemeValue,
  derive: (palette: ThemePalette) => Partial<Properties>,
): void => {
  instance.watch(theme, (palette) => instance.setProperties(derive(palette)));
};

export const themeColor = (theme: ThemeValue, token: ThemeToken): fk.Color3 => theme.get()[token];

/** Drives every theme consumer from one retained spring so colors stay synchronized. */
export const bindThemeTransition = (
  owner: fk.Instance,
  mode: fk.Value<ThemeMode>,
  palette: ThemeValue,
): void => {
  const transition = fk.createFrame({
    Name: 'ThemeTransition',
    Rotation: mode.get() === 'light' ? 1 : 0,
    Visible: false,
  });
  const state = { initialized: false };

  transition.onPropertyChanged('Rotation', (progress) => {
    palette.set(interpolatePalette(progress));
  });
  owner.watch(mode, (nextMode) => {
    const goal = nextMode === 'light' ? 1 : 0;
    if (!state.initialized || prefersReducedMotion()) {
      state.initialized = true;
      transition.Rotation = goal;
      palette.set(themes[nextMode]);
      return;
    }
    fka.spring(transition, { Rotation: goal }, themeSpringOptions);
  });
  owner.watch(palette, applyDocumentPalette);
  owner.onDestroy(() => {
    transition.destroy();
    for (const property of documentPaletteProperties) {
      document.documentElement.style.removeProperty(property);
    }
  });
};

export const resolveInitialTheme = (): ThemeMode => {
  try {
    const stored = window.localStorage.getItem(themeStorageKey);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // Storage can be unavailable in embedded previews. The system preference is still useful.
  }

  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
};

/** Keeps DOM-only styling and persistence synchronized with the FrameKit theme value. */
export const bindDocumentTheme = (owner: fk.Instance, theme: fk.Value<ThemeMode>): void => {
  const root = document.documentElement;
  const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const previousTheme = root.getAttribute('data-framekit-theme');
  const previousThemeColor = themeColorMeta?.content;

  owner.watch(theme, (mode) => {
    root.setAttribute('data-framekit-theme', mode);
    if (themeColorMeta) themeColorMeta.content = documentThemeColors[mode];
    try {
      window.localStorage.setItem(themeStorageKey, mode);
    } catch {
      // Theme switching remains functional when storage is unavailable.
    }
  });
  owner.onDestroy(() => {
    if (previousTheme === null) root.removeAttribute('data-framekit-theme');
    else root.setAttribute('data-framekit-theme', previousTheme);
    if (themeColorMeta && previousThemeColor !== undefined) {
      themeColorMeta.content = previousThemeColor;
    }
  });
};

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const interpolatePalette = (progress: number): ThemePalette => {
  const alpha = Math.min(1, Math.max(0, progress));
  const color = (token: ThemeToken): fk.Color3 =>
    interpolateColor(themes.dark[token], themes.light[token], alpha);
  return Object.freeze({
    canvas: color('canvas'),
    surface: color('surface'),
    surfaceRaised: color('surfaceRaised'),
    border: color('border'),
    text: color('text'),
    textMuted: color('textMuted'),
    textFaint: color('textFaint'),
    accent: color('accent'),
    accentMuted: color('accentMuted'),
    onAccent: color('onAccent'),
    blue: color('blue'),
    purple: color('purple'),
    orange: color('orange'),
  });
};

const interpolateColor = (from: fk.Color3, to: fk.Color3, progress: number): fk.Color3 =>
  fk.color3FromRGB(
    from.R + (to.R - from.R) * progress,
    from.G + (to.G - from.G) * progress,
    from.B + (to.B - from.B) * progress,
  );

const applyDocumentPalette = (palette: ThemePalette): void => {
  const root = document.documentElement.style;
  root.setProperty('--pg-canvas', colorToCss(palette.canvas));
  root.setProperty('--pg-border', colorToCss(palette.border));
  root.setProperty('--pg-grid', colorToCss(palette.accent, 0.06));
  root.setProperty('--pg-glow', colorToCss(palette.blue, 0.14));
  root.setProperty('--pg-scroll-track', colorToCss(palette.canvas));
  root.setProperty('--pg-scroll-thumb', colorToCss(palette.textFaint));
  root.setProperty('--pg-scroll-hover', colorToCss(palette.accent));
  root.setProperty('--pg-focus', colorToCss(palette.accent));
  root.setProperty('--pg-selection-text', colorToCss(palette.onAccent));
};

const colorToCss = (color: fk.Color3, alpha = 1): string =>
  `rgb(${color.R} ${color.G} ${color.B} / ${alpha})`;

/** Installs the DOM styling needed for fonts, scrollbars, and focus states. */
export const installPlaygroundStyles = (): void => {
  if (document.querySelector('[data-framekit-playground-styles]')) return;
  const style = document.createElement('style');
  style.dataset.framekitPlaygroundStyles = '';
  style.textContent = `
    :root {
      color-scheme: dark;
      font-synthesis: none;
      --pg-canvas: #0a0d12;
      --pg-border: rgb(48 61 76);
      --pg-grid: rgba(118, 237, 173, .055);
      --pg-glow: rgba(112, 178, 255, .16);
      --pg-scroll-track: #0a0d12;
      --pg-scroll-thumb: #526174;
      --pg-scroll-hover: #76edad;
      --pg-focus: #76edad;
    }
    :root[data-framekit-theme="light"] {
      color-scheme: light;
      --pg-canvas: #f5f7fa;
      --pg-border: rgb(207 216 226);
      --pg-grid: rgba(18, 153, 98, .07);
      --pg-glow: rgba(33, 111, 203, .12);
      --pg-scroll-track: #f5f7fa;
      --pg-scroll-thumb: #9cabbc;
      --pg-scroll-hover: #129962;
      --pg-focus: #129962;
    }
    * { box-sizing: border-box; }
    html, body, #root {
      width: 100%; height: 100%; margin: 0; overflow: hidden; background: var(--pg-canvas);
    }
    body { font-family: ${fonts.sans}; }
    ::selection { color: var(--pg-selection-text); background: var(--pg-focus); }
    .pg-scroll {
      scrollbar-color: var(--pg-scroll-thumb) var(--pg-scroll-track);
      scrollbar-gutter: stable;
    }
    .pg-scroll::-webkit-scrollbar { width: ${scrollbarThickness}px; height: ${scrollbarThickness}px; }
    .pg-scroll::-webkit-scrollbar-track { background: var(--pg-scroll-track); }
    .pg-scroll::-webkit-scrollbar-thumb {
      min-height: 48px;
      border: 3px solid var(--pg-scroll-track);
      border-radius: 999px;
      background: var(--pg-scroll-thumb);
      background-clip: padding-box;
    }
    .pg-scroll::-webkit-scrollbar-thumb:hover {
      background: var(--pg-scroll-hover); background-clip: padding-box;
    }
    .pg-scroll::-webkit-scrollbar-corner { background: var(--pg-scroll-track); }
    .pg-grid {
      background-image:
        linear-gradient(var(--pg-grid) 1px, transparent 1px),
        linear-gradient(90deg, var(--pg-grid) 1px, transparent 1px);
      background-size: 28px 28px;
    }
    .pg-glow { box-shadow: 0 24px 90px var(--pg-glow); }
    .pg-button { cursor: pointer; transition: filter 140ms ease; }
    .pg-button:hover { filter: brightness(1.06); }
    .pg-button:active { filter: brightness(.92); }
    .pg-button:focus-visible { outline: 3px solid var(--pg-focus); outline-offset: 3px; }
    .pg-code { font-variant-ligatures: none; }
    @media (prefers-reduced-motion: reduce) {
      * { animation-duration: .001ms !important; animation-iteration-count: 1 !important; }
    }
  `;
  document.head.append(style);
};
