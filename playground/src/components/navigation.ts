import { fk } from 'framekit';

import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { repositoryUrl } from '../links';
import type { SitePage } from '../router';
import { bindThemeColors, fonts, typeScale, type ThemeMode, type ThemeValue } from '../theme';
import { createButton, createText } from '../ui';

export const createNavigation = (
  page: fk.ScrollingFrame,
  route: fk.Value<SitePage>,
  navigate: (page: SitePage) => void,
  layout: fk.Value<PlaygroundLayout>,
  mode: fk.Value<ThemeMode>,
  theme: ThemeValue,
): fk.Frame => {
  const navigation = fk.createFrame({
    Name: 'Navigation',
    Size: fk.udim2(1, 0, 0, 64),
    BackgroundTransparency: 0.05,
    ZIndex: 100,
  });
  bindThemeColors(navigation, theme, (palette) => ({ BackgroundColor3: palette.canvas }));

  const mark = createButton(theme, {
    label: 'F',
    name: 'HomeButton',
    size: fk.udim2FromOffset(36, 36),
    position: fk.udim2FromOffset(18, 14),
    background: 'accent',
    foreground: 'onAccent',
    textSize: 17,
  });
  const brand = createText(theme, {
    text: 'FrameKit',
    name: 'BrandName',
    size: fk.udim2FromOffset(110, 36),
    position: fk.udim2FromOffset(66, 14),
    textSize: typeScale.body,
    weight: 850,
  });
  mark.onClick(() => navigate('home'));
  navigation.addChild(mark);
  navigation.addChild(brand);

  const guide = createButton(theme, {
    label: 'Guide',
    name: 'GuideNavButton',
    size: fk.udim2FromOffset(74, 36),
    position: fk.udim2(1, -360, 0, 14),
    background: 'canvas',
    foreground: 'textMuted',
    textSize: typeScale.small,
  });
  const api = createButton(theme, {
    label: 'API',
    name: 'ApiNavButton',
    size: fk.udim2FromOffset(66, 36),
    position: fk.udim2(1, -280, 0, 14),
    background: 'canvas',
    foreground: 'textMuted',
    textSize: typeScale.small,
  });
  const source = createButton(theme, {
    label: 'GitHub',
    name: 'SourceNavButton',
    size: fk.udim2FromOffset(78, 36),
    position: fk.udim2(1, -208, 0, 14),
    background: 'canvas',
    foreground: 'textMuted',
    textSize: typeScale.small,
  });
  guide.onClick(() => navigate('guide'));
  api.onClick(() => navigate('api'));
  source.onClick(() => window.open(repositoryUrl, '_blank', 'noopener,noreferrer'));
  navigation.addChild(guide);
  navigation.addChild(api);
  navigation.addChild(source);

  const themeToggle = createButton(theme, {
    label: '🌞  Light',
    name: 'ThemeToggleButton',
    size: fk.udim2FromOffset(104, 36),
    position: fk.udim2(1, -122, 0, 14),
    background: 'surfaceRaised',
    foreground: 'text',
    font: fonts.mono,
    textSize: typeScale.caption,
  });
  themeToggle.onClick(() => mode.set(mode.get() === 'dark' ? 'light' : 'dark'));
  navigation.addChild(themeToggle);

  const track = fk.createFrame({
    Name: 'ScrollProgressTrack',
    Size: fk.udim2(1, 0, 0, 2),
    Position: fk.udim2FromOffset(0, 62),
    ZIndex: 101,
  });
  const progress = fk.createFrame({ Name: 'ScrollProgress', Size: fk.udim2FromScale(0, 1) });
  bindThemeColors(track, theme, (palette) => ({ BackgroundColor3: palette.border }));
  bindThemeColors(progress, theme, (palette) => ({ BackgroundColor3: palette.accent }));
  track.addChild(progress);
  navigation.addChild(track);

  const listenerController = new AbortController();
  page.element.addEventListener(
    'scroll',
    () => {
      const maximum = Math.max(1, page.element.scrollHeight - page.element.clientHeight);
      progress.Size = fk.udim2FromScale(
        Math.min(1, Math.max(0, page.element.scrollTop / maximum)),
        1,
      );
    },
    { passive: true, signal: listenerController.signal },
  );
  navigation.onDestroy(() => listenerController.abort());

  const updateNavigation = (): void => {
    const palette = theme.get();
    guide.TextColor3 = route.get() === 'guide' ? palette.accent : palette.textMuted;
    api.TextColor3 = route.get() === 'api' ? palette.accent : palette.textMuted;
  };
  navigation.watch(route, updateNavigation);
  navigation.watch(mode, (currentMode) => {
    themeToggle.Text = currentMode === 'dark' ? '🌞  Light' : '🌙  Dark';
    themeToggle.AccessibleLabel = `Switch to ${currentMode === 'dark' ? 'light' : 'dark'} mode`;
  });
  navigation.watch(theme, updateNavigation);
  bindLayoutProperties(navigation, layout, brand, {
    desktop: { Visible: true },
    mobile: { Visible: false },
  });
  bindLayoutProperties(navigation, layout, guide, {
    desktop: { Position: fk.udim2(1, -360, 0, 14), Size: fk.udim2FromOffset(74, 36) },
    mobile: { Position: fk.udim2FromOffset(70, 14), Size: fk.udim2FromOffset(68, 36) },
  });
  bindLayoutProperties(navigation, layout, api, {
    desktop: { Position: fk.udim2(1, -280, 0, 14), Size: fk.udim2FromOffset(66, 36) },
    mobile: { Position: fk.udim2FromOffset(142, 14), Size: fk.udim2FromOffset(58, 36) },
  });
  bindLayoutProperties(navigation, layout, source, {
    desktop: { Visible: true },
    mobile: { Visible: false },
  });
  bindLayoutProperties(navigation, layout, themeToggle, {
    desktop: { Position: fk.udim2(1, -122, 0, 14), Size: fk.udim2FromOffset(104, 36) },
    mobile: { Position: fk.udim2(1, -116, 0, 14), Size: fk.udim2FromOffset(104, 36) },
  });
  return navigation;
};
