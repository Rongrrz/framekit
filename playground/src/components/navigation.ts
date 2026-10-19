import {
  watchOwnedValue,
  createFrame,
  type Frame,
  type ScrollingFrame,
  udim2,
  udim2FromOffset,
  udim2FromScale,
  type ObservableValue,
  bindTooltip,
} from 'framekit';

import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { repositoryUrl } from '../links';
import type { SitePage } from '../router';
import { bindThemeColors, fonts, typeScale, type ThemeMode, type ThemeValue } from '../theme';
import { createButton, createText } from '../ui';

export const createNavigation = (
  page: ScrollingFrame,
  route: ObservableValue<SitePage>,
  navigate: (page: SitePage) => void,
  layout: ObservableValue<PlaygroundLayout>,
  mode: ObservableValue<ThemeMode>,
  theme: ThemeValue,
): Frame => {
  const navigation = createFrame({
    Name: 'Navigation',
    Size: udim2(1, 0, 0, 64),
    BackgroundTransparency: 0.05,
    ZIndex: 100,
  });

  navigation.unsafeElement.setAttribute('role', 'navigation');
  navigation.unsafeElement.setAttribute('aria-label', 'Primary');
  bindThemeColors(navigation, theme, (palette) => ({ BackgroundColor3: palette.canvas }));

  const mark = createButton(theme, {
    label: 'F',
    name: 'HomeButton',
    size: udim2FromOffset(36, 36),
    position: udim2FromOffset(18, 14),
    background: 'accent',
    foreground: 'onAccent',
    textSize: 17,
  });

  const brand = createText(theme, {
    text: 'FrameKit',
    name: 'BrandName',
    size: udim2FromOffset(110, 36),
    position: udim2FromOffset(66, 14),
    textSize: typeScale.body,
    weight: 700,
  });

  mark.onClick(() => navigate('home'));
  mark.Parent = navigation;
  brand.Parent = navigation;

  const guide = createButton(theme, {
    label: 'Docs',
    name: 'GuideNavButton',
    size: udim2FromOffset(74, 36),
    position: udim2(1, -478, 0, 14),
    background: 'canvas',
    foreground: 'textMuted',
    textSize: typeScale.small,
  });

  const api = createButton(theme, {
    label: 'Reference',
    name: 'ApiNavButton',
    size: udim2FromOffset(90, 36),
    position: udim2(1, -398, 0, 14),
    background: 'canvas',
    foreground: 'textMuted',
    textSize: typeScale.small,
  });

  const source = createButton(theme, {
    label: 'GitHub',
    name: 'SourceNavButton',
    size: udim2FromOffset(78, 36),
    position: udim2(1, -202, 0, 14),
    background: 'canvas',
    foreground: 'textMuted',
    textSize: typeScale.small,
  });

  const examples = createButton(theme, {
    label: 'Examples',
    name: 'ExamplesNavButton',
    size: udim2FromOffset(90, 36),
    position: udim2(1, -302, 0, 14),
    background: 'canvas',
    foreground: 'textMuted',
    textSize: typeScale.small,
  });

  guide.onClick(() => navigate('guide'));
  api.onClick(() => navigate('api'));
  examples.onClick(() => navigate('examples'));
  source.onClick(() => window.open(repositoryUrl, '_blank', 'noopener,noreferrer'));
  guide.Parent = navigation;
  api.Parent = navigation;
  source.Parent = navigation;
  examples.Parent = navigation;

  const themeToggle = createButton(theme, {
    label: '☀  Light',
    name: 'ThemeToggleButton',
    size: udim2FromOffset(104, 36),
    position: udim2(1, -122, 0, 14),
    background: 'surfaceRaised',
    foreground: 'text',
    font: fonts.mono,
    textSize: typeScale.caption,
  });

  themeToggle.onClick(() => mode.set(mode.get() === 'dark' ? 'light' : 'dark'));
  themeToggle.Parent = navigation;
  bindTooltip(themeToggle, 'Switch between light and dark themes', { placement: 'bottom' });

  const track = createFrame({
    Name: 'ScrollProgressTrack',
    Size: udim2(1, 0, 0, 2),
    Position: udim2FromOffset(0, 62),
    ZIndex: 101,
  });

  const progress = createFrame({ Name: 'ScrollProgress', Size: udim2FromScale(0, 1) });
  bindThemeColors(track, theme, (palette) => ({ BackgroundColor3: palette.border }));
  bindThemeColors(progress, theme, (palette) => ({ BackgroundColor3: palette.accent }));
  progress.Parent = track;
  track.Parent = navigation;

  const listenerController = new AbortController();
  page.unsafeElement.addEventListener(
    'scroll',
    () => {
      const maximum = Math.max(
        1,
        page.unsafeElement.scrollHeight - page.unsafeElement.clientHeight,
      );

      progress.Size = udim2FromScale(
        Math.min(1, Math.max(0, page.unsafeElement.scrollTop / maximum)),
        1,
      );
    },
    { passive: true, signal: listenerController.signal },
  );
  navigation.onDestroy(() => listenerController.abort());

  const updateNavigation = (): void => {
    const palette = theme.get();
    guide.TextColor3 =
      route.get() !== 'home' && route.get() !== 'api' && route.get() !== 'examples'
        ? palette.accent
        : palette.textMuted;
    api.TextColor3 = route.get() === 'api' ? palette.accent : palette.textMuted;
    examples.TextColor3 = route.get() === 'examples' ? palette.accent : palette.textMuted;
  };

  watchOwnedValue(navigation, route, updateNavigation);
  const updateThemeToggle = (): void => {
    const currentMode = mode.get();
    themeToggle.Text =
      layout.get() === 'mobile'
        ? currentMode === 'dark'
          ? '☀'
          : '◐'
        : currentMode === 'dark'
          ? '☀  Light'
          : '◐  Dark';
    themeToggle.AccessibleLabel = `Switch to ${currentMode === 'dark' ? 'light' : 'dark'} mode`;
  };
  watchOwnedValue(navigation, mode, updateThemeToggle);
  watchOwnedValue(navigation, layout, updateThemeToggle);
  watchOwnedValue(navigation, theme, updateNavigation);
  bindLayoutProperties(navigation, layout, brand, {
    desktop: { Visible: true },
    mobile: { Visible: false },
  });

  bindLayoutProperties(navigation, layout, guide, {
    desktop: { Position: udim2(1, -478, 0, 14), Size: udim2FromOffset(74, 36) },
    mobile: { Position: udim2FromOffset(60, 14), Size: udim2FromOffset(54, 36) },
  });

  bindLayoutProperties(navigation, layout, api, {
    desktop: { Position: udim2(1, -398, 0, 14), Size: udim2FromOffset(90, 36) },
    mobile: { Position: udim2FromOffset(116, 14), Size: udim2FromOffset(76, 36) },
  });

  bindLayoutProperties(navigation, layout, examples, {
    desktop: { Position: udim2(1, -302, 0, 14), Size: udim2FromOffset(90, 36) },
    mobile: { Position: udim2FromOffset(194, 14), Size: udim2FromOffset(70, 36) },
  });

  bindLayoutProperties(navigation, layout, source, {
    desktop: { Visible: true },
    mobile: { Visible: false },
  });

  bindLayoutProperties(navigation, layout, themeToggle, {
    desktop: { Position: udim2(1, -122, 0, 14), Size: udim2FromOffset(104, 36) },
    mobile: { Position: udim2(1, -54, 0, 14), Size: udim2FromOffset(40, 36) },
  });

  return navigation;
};
