import { fk } from 'framekit';

import { bindButtonMotion, bindScaleMotion } from '../../shared/interaction';
import { button, text } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { contentWidth, scaledPosition, scaledSize } from '../geometry';
import { designWidth, sectionLayout } from '../layout';

type NavigationKey = 'why' | 'playground' | 'composer' | 'api';

export function createNavigation(
  page: fk.ScrollingFrameNode,
  navigate: (offset: number) => void,
  pageScale: () => number,
): fk.FrameNode {
  const navigation = fk.createFrame({
    Name: 'Navigation',
    Size: fk.udim2(1, 0, 0, 76),
    BackgroundColor3: colors.ink,
    BackgroundTransparency: 0.04,
    ZIndex: 100,
  });
  fk.append(navigation, fk.createUIStroke({ Color: colors.inkSoft, Thickness: 1 }));

  const content = fk.createFrame({
    Name: 'NavigationContent',
    Size: fk.udim2FromScale(contentWidth / designWidth, 1),
    Position: fk.udim2FromScale(0.5, 0),
    AnchorPoint: fk.vector2(0.5, 0),
    BackgroundTransparency: 1,
  });
  const mark = button(
    'F',
    fk.udim2FromOffset(38, 38),
    fk.udim2FromOffset(0, 19),
    colors.coral,
    colors.ink,
  );
  fk.update(mark, { TextSize: 20, FontWeight: 900 });
  bindButtonMotion(mark, colors.coral, colors.amber);
  fk.on(mark, 'MouseButton1Click', () => navigate(0));
  fk.append(content, mark);
  fk.append(
    content,
    text({
      text: 'FRAMEKIT',
      size: fk.udim2FromOffset(170, 38),
      position: fk.udim2FromOffset(52, 19),
      textSize: 17,
      weight: 850,
    }),
  );
  fk.append(
    content,
    text({
      text: '0.1  /  ALPHA',
      size: fk.udim2FromOffset(130, 24),
      position: fk.udim2FromOffset(166, 26),
      color: colors.textMuted,
      textSize: 9,
      font: fonts.mono,
    }),
  );

  const links: readonly [NavigationKey, string, number][] = [
    ['why', 'WHY', sectionLayout.principles.top],
    ['playground', 'MOTION', sectionLayout.motion.top],
    ['composer', 'COMPOSER', sectionLayout.composer.top],
    ['api', 'API', sectionLayout.api.top],
  ];
  const linkButtons = new Map<NavigationKey, fk.TextButtonNode>();
  for (const [index, [key, label, offset]] of links.entries()) {
    const link = button(
      label,
      scaledSize(104, 38, contentWidth, 76),
      scaledPosition(516 + index * 112, 19, contentWidth, 76),
      colors.ink,
      colors.textMuted,
    );
    fk.update(link, { TextSize: 10, FontFamily: fonts.mono });
    bindScaleMotion(link, 1.045);
    fk.on(link, 'MouseButton1Click', () => navigate(offset));
    linkButtons.set(key, link);
    fk.append(content, link);
  }

  const source = button(
    'VIEW SOURCE  ↗',
    scaledSize(150, 42, contentWidth, 76),
    scaledPosition(970, 17, contentWidth, 76),
    colors.paper,
    colors.ink,
  );
  bindButtonMotion(source, colors.paper, colors.mint);
  fk.on(source, 'MouseButton1Click', () => {
    window.open('https://github.com/Rongrrz/framekit', '_blank', 'noopener,noreferrer');
  });
  fk.append(content, source);
  fk.append(navigation, content);

  const progressTrack = fk.createFrame({
    Name: 'ScrollProgressTrack',
    Size: fk.udim2(1, 0, 0, 3),
    Position: fk.udim2FromOffset(0, 73),
    BackgroundColor3: colors.inkSoft,
    ZIndex: 102,
  });
  const progress = fk.createFrame({
    Name: 'ScrollProgress',
    Size: fk.udim2FromScale(0, 1),
    BackgroundColor3: colors.coral,
    ZIndex: 103,
  });
  fk.append(progressTrack, progress);
  fk.append(navigation, progressTrack);

  function updateScrollState(): void {
    const maximum = Math.max(1, page.element.scrollHeight - page.element.clientHeight);
    const y = page.element.scrollTop;
    const scale = pageScale();
    fk.update(progress, { Size: fk.udim2FromScale(Math.min(1, y / maximum), 1) });
    const active: NavigationKey =
      y >= (sectionLayout.api.top - 180) * scale
        ? 'api'
        : y >= (sectionLayout.composer.top - 180) * scale
          ? 'composer'
          : y >= (sectionLayout.motion.top - 180) * scale
            ? 'playground'
            : 'why';
    for (const [key, link] of linkButtons) {
      const selected = key === active;
      fk.update(link, {
        BackgroundColor3: selected ? colors.inkSoft : colors.ink,
        TextColor3: selected ? colors.text : colors.textMuted,
      });
    }
  }

  function updateNavigationLayout(): void {
    const compact = window.innerWidth < 920;
    const narrow = window.innerWidth < 520;
    fk.update(content, {
      Size: compact ? fk.udim2(1, -32, 1, 0) : fk.udim2FromScale(contentWidth / designWidth, 1),
    });
    for (const link of linkButtons.values()) fk.update(link, { Visible: !compact });
    fk.update(source, {
      Size: narrow ? fk.udim2FromOffset(112, 42) : fk.udim2FromOffset(150, 42),
      Position: narrow ? fk.udim2(1, -112, 0, 17) : fk.udim2(1, -150, 0, 17),
      Text: narrow ? 'SOURCE  ↗' : 'VIEW SOURCE  ↗',
    });
  }

  page.element.addEventListener('scroll', updateScrollState, { passive: true });
  window.addEventListener('resize', updateNavigationLayout);
  updateNavigationLayout();
  updateScrollState();
  return navigation;
}
