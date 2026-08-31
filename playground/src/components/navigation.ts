import { fk } from 'framekit';

import type { PlaygroundLayout, SectionName } from '../layout';
import { guideUrl } from '../links';
import { bindThemeProperties, fonts, themes, type ThemeMode } from '../theme';
import { createButton, createText } from '../ui';

export const createNavigation = (
  page: fk.ScrollingFrame,
  navigate: (section: SectionName | 'top') => void,
  layout: fk.Value<PlaygroundLayout>,
  theme: fk.Value<ThemeMode>,
): fk.Frame => {
  const navigation = fk.createFrame({
    Name: 'Navigation',
    Size: fk.udim2(1, 0, 0, 72),
    BackgroundTransparency: 0.04,
    ZIndex: 100,
  });
  navigation.element.style.backdropFilter = 'blur(18px) saturate(1.15)';
  bindThemeProperties(navigation, theme, (palette) => ({ BackgroundColor3: palette.surface }));

  const mark = createButton(theme, {
    label: 'F',
    name: 'HomeButton',
    size: fk.udim2FromOffset(40, 40),
    position: fk.udim2FromOffset(18, 15),
    background: 'accent',
    foreground: 'onAccent',
    textSize: 18,
  });
  mark.onClick(() => navigate('top'));
  navigation.addChild(mark);
  navigation.addChild(
    createText(theme, {
      text: 'FRAMEKIT',
      size: fk.udim2FromOffset(120, 28),
      position: fk.udim2FromOffset(70, 10),
      textSize: 14,
      weight: 900,
    }),
  );
  navigation.addChild(
    createText(theme, {
      text: 'TYPED UI OBJECTS',
      size: fk.udim2FromOffset(170, 22),
      position: fk.udim2FromOffset(70, 36),
      color: 'textFaint',
      textSize: 8,
      font: fonts.mono,
      weight: 700,
    }),
  );

  const api = createButton(theme, {
    label: 'API',
    name: 'ApiNavButton',
    size: fk.udim2FromOffset(88, 38),
    position: fk.udim2(0.5, -98, 0, 17),
    background: 'surface',
    foreground: 'textMuted',
    font: fonts.mono,
    textSize: 8,
  });
  const guide = createButton(theme, {
    label: 'GUIDE  📚',
    name: 'GuideNavButton',
    size: fk.udim2FromOffset(108, 38),
    position: fk.udim2(0.5, 10, 0, 17),
    background: 'surface',
    foreground: 'textMuted',
    font: fonts.mono,
    textSize: 8,
  });
  api.onClick(() => navigate('guide'));
  guide.onClick(() => window.open(guideUrl, '_blank', 'noopener,noreferrer'));
  navigation.addChild(api);
  navigation.addChild(guide);

  const themeToggle = createButton(theme, {
    label: '🌞  LIGHT',
    name: 'ThemeToggleButton',
    size: fk.udim2FromOffset(108, 40),
    position: fk.udim2(1, -126, 0, 15),
    background: 'surfaceRaised',
    foreground: 'text',
    font: fonts.mono,
    textSize: 8,
  });
  themeToggle.onClick(() => theme.set(theme.get() === 'dark' ? 'light' : 'dark'));
  themeToggle.watch(theme, (mode) => {
    themeToggle.Text = mode === 'dark' ? '🌞  LIGHT' : '🌙  DARK';
    themeToggle.element.setAttribute(
      'aria-label',
      `Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`,
    );
    themeToggle.element.setAttribute('aria-pressed', String(mode === 'light'));
  });
  navigation.addChild(themeToggle);

  const track = fk.createFrame({
    Name: 'ScrollProgressTrack',
    Size: fk.udim2(1, 0, 0, 2),
    Position: fk.udim2FromOffset(0, 70),
    ZIndex: 101,
  });
  const progress = fk.createFrame({
    Name: 'ScrollProgress',
    Size: fk.udim2FromScale(0, 1),
    ZIndex: 102,
  });
  bindThemeProperties(track, theme, (palette) => ({ BackgroundColor3: palette.border }));
  bindThemeProperties(progress, theme, (palette) => ({ BackgroundColor3: palette.accent }));
  track.addChild(progress);
  navigation.addChild(track);

  const listenerController = new AbortController();
  page.element.addEventListener(
    'scroll',
    () => {
      const maximum = Math.max(1, page.element.scrollHeight - page.element.clientHeight);
      const scrollProgress = Math.min(1, Math.max(0, page.element.scrollTop / maximum));
      progress.Size = fk.udim2FromScale(scrollProgress, 1);
    },
    { passive: true, signal: listenerController.signal },
  );
  navigation.onDestroy(() => listenerController.abort());

  navigation.watch(layout, (currentLayout) => {
    const desktop = currentLayout === 'desktop';
    api.Visible = desktop;
    guide.Visible = desktop;
    themeToggle.Position = fk.udim2(1, desktop ? -126 : -120, 0, 15);
  });
  navigation.watch(theme, (mode) => {
    const border = themes[mode].border;
    navigation.element.style.borderBottom = `1px solid rgb(${border.R} ${border.G} ${border.B})`;
  });
  return navigation;
};
