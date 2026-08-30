import { fk } from 'framekit';

import { bindButtonMotion } from '../behaviors/hover-motion';
import type { PlaygroundLayout, SectionName } from '../layout';
import { colors, fonts } from '../theme';
import { createButton, createText } from '../ui';

/** Creates the glass command bar and its live scroll progress. */
export function createNavigation(
  page: fk.ScrollingFrame,
  navigate: (section: SectionName | 'top') => void,
  layout: fk.Value<PlaygroundLayout>,
): fk.Frame {
  const navigation = fk.createFrame({
    Name: 'Navigation',
    Size: fk.udim2(1, 0, 0, 72),
    BackgroundColor3: colors.ink,
    BackgroundTransparency: 0.08,
    ZIndex: 100,
  });
  navigation.element.style.backdropFilter = 'blur(22px) saturate(1.3)';
  navigation.element.style.borderBottom = '1px solid rgba(197,255,83,.14)';

  const mark = createButton(
    'F',
    fk.udim2FromOffset(42, 42),
    fk.udim2FromOffset(18, 14),
    colors.mint,
    colors.ink,
  );
  mark.setProperties({ TextSize: 19, FontWeight: 950 });
  mark.element.classList.add('fk-glow');
  bindButtonMotion(mark, colors.mint, colors.cyan);
  mark.onClick(() => navigate('top'));
  navigation.addChild(mark);

  navigation.addChild(
    createText({
      text: 'FRAMEKIT',
      size: fk.udim2FromOffset(120, 28),
      position: fk.udim2FromOffset(72, 13),
      textSize: 14,
      weight: 900,
    }),
  );
  navigation.addChild(
    createText({
      text: 'MOTION OS  /  01',
      size: fk.udim2FromOffset(170, 22),
      position: fk.udim2FromOffset(72, 38),
      color: colors.textMuted,
      textSize: 8,
      font: fonts.mono,
      weight: 700,
    }),
  );

  const links = [
    { label: 'REACTOR', section: 'motion' },
    { label: 'SCENES', section: 'modifiers' },
    { label: 'MANIFESTO', section: 'api' },
  ] as const;
  const linkButtons = links.map(({ label, section }, index) => {
    const link = createButton(
      `0${index + 1}  ${label}`,
      fk.udim2FromOffset(126, 40),
      fk.udim2(0.5, -198 + index * 136, 0, 16),
      colors.ink,
      colors.textMuted,
    );
    link.setProperties({ TextSize: 8, FontFamily: fonts.mono });
    bindButtonMotion(link, colors.ink, colors.inkSoft);
    link.onClick(() => navigate(section));
    navigation.addChild(link);
    return link;
  });

  const source = createButton(
    'GET THE SOURCE  ↗',
    fk.udim2FromOffset(172, 42),
    fk.udim2(1, -190, 0, 14),
    colors.text,
    colors.ink,
  );
  source.setProperties({ TextSize: 9, FontFamily: fonts.mono });
  bindButtonMotion(source, colors.text, colors.mint);
  source.onClick(() => {
    window.open('https://github.com/Rongrrz/framekit', '_blank', 'noopener,noreferrer');
  });
  navigation.addChild(source);

  const live = fk.createFrame({
    Size: fk.udim2FromOffset(7, 7),
    Position: fk.udim2(1, -214, 0, 32),
    BackgroundColor3: colors.mint,
  });
  live.addChild(fk.createUICorner({ CornerRadius: 99 }));
  live.element.classList.add('fk-breathe');
  navigation.addChild(live);

  const track = fk.createFrame({
    Size: fk.udim2(1, 0, 0, 2),
    Position: fk.udim2FromOffset(0, 70),
    BackgroundColor3: colors.inkSoft,
    ZIndex: 101,
  });
  const progress = fk.createFrame({
    Size: fk.udim2FromScale(0, 1),
    BackgroundColor3: colors.mint,
    ZIndex: 102,
  });
  progress.element.style.boxShadow = '0 0 14px rgba(197,255,83,.8)';
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
    for (const link of linkButtons) link.Visible = desktop;
    live.Visible = desktop;
    source.setProperties({
      Text: desktop ? 'GET THE SOURCE  ↗' : 'SOURCE  ↗',
      Size: fk.udim2FromOffset(desktop ? 172 : 112, 42),
      Position: fk.udim2(1, desktop ? -190 : -128, 0, 14),
    });
  });

  return navigation;
}
