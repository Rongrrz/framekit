import { fk } from 'framekit';

import { bindButtonMotion } from '../../shared/interaction';
import { createButton, createText } from '../../shared/ui';
import { colors, fonts } from '../../theme';

export function createNavigation(
  page: fk.ScrollingFrameNode,
  navigate: (offset: number) => void,
): fk.FrameNode {
  const navigation = fk.createFrame({
    Name: 'MobileNavigation',
    Size: fk.udim2(1, 0, 0, 64),
    BackgroundColor3: colors.ink,
    ZIndex: 100,
  });

  const mark = createButton(
    'F',
    fk.udim2FromOffset(36, 36),
    fk.udim2FromOffset(16, 14),
    colors.coral,
    colors.ink,
  );
  mark.setProperties({ TextSize: 18, FontWeight: 900 });
  bindButtonMotion(mark, colors.coral, colors.amber);
  mark.onClick(() => navigate(0));

  navigation.addChild(mark);

  navigation.addChild(
    createText({
      text: 'FRAMEKIT',
      size: fk.udim2FromOffset(150, 36),
      position: fk.udim2FromOffset(62, 14),
      textSize: 15,
      weight: 850,
    }),
  );

  const source = createButton(
    'SOURCE  ↗',
    fk.udim2FromOffset(112, 38),
    fk.udim2(1, -128, 0, 13),
    colors.paper,
    colors.ink,
  );
  source.setProperties({ TextSize: 10, FontFamily: fonts.mono });
  bindButtonMotion(source, colors.paper, colors.mint);
  source.onClick(() => {
    window.open('https://github.com/Rongrrz/framekit', '_blank', 'noopener,noreferrer');
  });

  navigation.addChild(source);

  const track = fk.createFrame({
    Size: fk.udim2(1, 0, 0, 3),
    Position: fk.udim2FromOffset(0, 61),
    BackgroundColor3: colors.inkSoft,
    ZIndex: 101,
  });

  const progress = fk.createFrame({
    Size: fk.udim2FromScale(0, 1),
    BackgroundColor3: colors.coral,
    ZIndex: 102,
  });

  track.addChild(progress);

  navigation.addChild(track);

  const listenerController = new AbortController();
  page.element.addEventListener(
    'scroll',
    () => {
      const maximum = Math.max(1, page.element.scrollHeight - page.element.clientHeight);
      const scrollProgress = Math.min(1, Math.max(0, page.element.scrollTop / maximum));
      progress.setProperties({ Size: fk.udim2FromScale(scrollProgress, 1) });
    },
    { passive: true, signal: listenerController.signal },
  );
  navigation.onDestroy(() => listenerController.abort());
  return navigation;
}
