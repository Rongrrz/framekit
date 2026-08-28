import { fk } from 'framekit';

import { bindButtonMotion, bindScaleMotion } from '../../shared/interaction';
import { createButton, createText } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { contentWidth, scaledPosition, scaledSize } from '../geometry';
import { designWidth, sectionLayout } from '../layout';

type NavigationKey = 'why' | 'playground' | 'composer' | 'api';

const navigationSections: readonly Readonly<{
  key: NavigationKey;
  label: string;
  offset: number;
}>[] = [
  { key: 'why', label: 'WHY', offset: sectionLayout.principles.top },
  { key: 'playground', label: 'MOTION', offset: sectionLayout.motion.top },
  { key: 'composer', label: 'COMPOSER', offset: sectionLayout.composer.top },
  { key: 'api', label: 'API', offset: sectionLayout.api.top },
];

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
  const mark = createButton(
    'F',
    fk.udim2FromOffset(38, 38),
    fk.udim2FromOffset(0, 19),
    colors.coral,
    colors.ink,
  );
  fk.update(mark, { TextSize: 20, FontWeight: 900 });
  bindButtonMotion(mark, colors.coral, colors.amber);
  mark.onClick(() => navigate(0));
  fk.append(content, mark);
  fk.append(
    content,
    createText({
      text: 'FRAMEKIT',
      size: fk.udim2FromOffset(170, 38),
      position: fk.udim2FromOffset(52, 19),
      textSize: 17,
      weight: 850,
    }),
  );
  fk.append(
    content,
    createText({
      text: '0.1  /  ALPHA',
      size: fk.udim2FromOffset(130, 24),
      position: fk.udim2FromOffset(166, 26),
      color: colors.textMuted,
      textSize: 9,
      font: fonts.mono,
    }),
  );

  const linkButtons = new Map<NavigationKey, fk.TextButtonNode>();
  for (const [index, { key, label, offset }] of navigationSections.entries()) {
    const link = createButton(
      label,
      scaledSize(104, 38, contentWidth, 76),
      scaledPosition(516 + index * 112, 19, contentWidth, 76),
      colors.ink,
      colors.textMuted,
    );
    fk.update(link, { TextSize: 10, FontFamily: fonts.mono });
    bindScaleMotion(link, 1.045);
    link.onClick(() => navigate(offset));
    linkButtons.set(key, link);
    fk.append(content, link);
  }

  const source = createButton(
    'VIEW SOURCE  ↗',
    scaledSize(150, 42, contentWidth, 76),
    scaledPosition(970, 17, contentWidth, 76),
    colors.paper,
    colors.ink,
  );
  bindButtonMotion(source, colors.paper, colors.mint);
  source.onClick(() => {
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
    fk.update(progress, { Size: fk.udim2FromScale(Math.min(1, Math.max(0, y / maximum)), 1) });
    const active = activeNavigationSection(y, scale);
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

  const listenerController = new AbortController();
  page.element.addEventListener('scroll', updateScrollState, {
    passive: true,
    signal: listenerController.signal,
  });
  window.addEventListener('resize', updateNavigationLayout, { signal: listenerController.signal });
  fk.onDestroy(navigation, () => listenerController.abort());
  updateNavigationLayout();
  updateScrollState();
  return navigation;
}

function activeNavigationSection(scrollTop: number, pageScale: number): NavigationKey {
  const activationOffset = 180;
  if (scrollTop >= (sectionLayout.api.top - activationOffset) * pageScale) return 'api';
  if (scrollTop >= (sectionLayout.composer.top - activationOffset) * pageScale) return 'composer';
  if (scrollTop >= (sectionLayout.motion.top - activationOffset) * pageScale) return 'playground';
  return 'why';
}
