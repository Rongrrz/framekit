import { fk } from 'framekit';

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

/** Applies properties derived from the current palette for the lifetime of the instance. */
export const bindThemeProperties = <Properties extends fk.InstanceProperties>(
  instance: fk.Instance<Properties>,
  theme: fk.Value<ThemeMode>,
  derive: (palette: ThemePalette) => Partial<Properties>,
): void => {
  instance.watch(theme, (mode) => instance.setProperties(derive(themes[mode])));
};

export const themeColor = (theme: fk.Value<ThemeMode>, token: ThemeToken): fk.Color3 =>
  themes[theme.get()][token];

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
    ::selection { color: #07160e; background: #76edad; }
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
