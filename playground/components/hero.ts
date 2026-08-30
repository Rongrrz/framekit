import { fk } from 'framekit';

import { copyCommand } from '../behaviors/copy-button';
import { bindButtonMotion } from '../behaviors/hover-motion';
import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { createSection, createSectionContent } from '../section';
import { colors, fonts } from '../theme';
import { createButton, createPill, createText } from '../ui';
import { createHeroPreview } from './hero-preview';

/** Creates the concise introduction and the playground's first live example. */
export function createHero(layout: fk.Value<PlaygroundLayout>, onExplore: () => void): fk.Frame {
  const section = createSection('hero', layout, colors.ink);
  const content = createSectionContent(section, layout);
  const pill = createPill(
    'ROBLOX-FAMILIAR  ·  WEB NATIVE',
    fk.udim2FromOffset(282, 36),
    fk.udim2FromOffset(0, 52),
    colors.mint,
  );
  const title = createText({
    text: 'Build web UI\nlike a game UI.',
    size: fk.udim2FromOffset(358, 170),
    position: fk.udim2FromOffset(0, 112),
    textSize: 42,
    weight: 900,
    wrapped: true,
    yAlignment: 'Top',
  });
  const description = createText({
    text: 'Create instances, parent them, change properties, and animate them. No render cycle or component lifecycle to memorize.',
    size: fk.udim2FromOffset(358, 112),
    position: fk.udim2FromOffset(0, 300),
    color: colors.textMuted,
    textSize: 15,
    wrapped: true,
    yAlignment: 'Top',
  });
  const explore = createButton(
    'OPEN THE MOTION LAB  ↓',
    fk.udim2FromOffset(220, 50),
    fk.udim2FromOffset(0, 432),
    colors.coral,
    colors.ink,
  );
  const install = createButton(
    'COPY INSTALL',
    fk.udim2FromOffset(124, 50),
    fk.udim2FromOffset(234, 432),
    colors.inkRaised,
    colors.text,
  );

  install.setProperties({ TextSize: 10, FontFamily: fonts.mono });
  bindButtonMotion(explore, colors.coral, colors.amber);
  bindButtonMotion(install, colors.inkRaised, colors.inkSoft);
  explore.onClick(onExplore);
  install.onClick(() => void copyCommand(install, 'npm i framekit', 'COPY INSTALL'));

  bindLayoutProperties(section, layout, pill, {
    desktop: { Position: fk.udim2FromOffset(0, 108) },
    mobile: { Position: fk.udim2FromOffset(0, 52) },
  });
  bindLayoutProperties(section, layout, title, {
    desktop: {
      Size: fk.udim2FromOffset(520, 180),
      Position: fk.udim2FromOffset(0, 174),
      TextSize: 58,
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 170),
      Position: fk.udim2FromOffset(0, 112),
      TextSize: 42,
    },
  });
  bindLayoutProperties(section, layout, description, {
    desktop: {
      Size: fk.udim2FromOffset(500, 90),
      Position: fk.udim2FromOffset(0, 376),
      TextSize: 17,
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 112),
      Position: fk.udim2FromOffset(0, 300),
      TextSize: 15,
    },
  });
  bindLayoutProperties(section, layout, explore, {
    desktop: {
      Size: fk.udim2FromOffset(236, 54),
      Position: fk.udim2FromOffset(0, 492),
    },
    mobile: {
      Size: fk.udim2FromOffset(220, 50),
      Position: fk.udim2FromOffset(0, 432),
    },
  });
  bindLayoutProperties(section, layout, install, {
    desktop: {
      Size: fk.udim2FromOffset(170, 54),
      Position: fk.udim2FromOffset(252, 492),
    },
    mobile: {
      Size: fk.udim2FromOffset(124, 50),
      Position: fk.udim2FromOffset(234, 432),
    },
  });

  content.addChild(pill);
  content.addChild(title);
  content.addChild(description);
  content.addChild(explore);
  content.addChild(install);
  content.addChild(createHeroPreview(layout));
  section.addChild(content);
  return section;
}
