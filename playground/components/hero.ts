import { fk } from 'framekit';

import { copyCommand } from '../behaviors/copy-button';
import { bindButtonMotion } from '../behaviors/hover-motion';
import { contentWidth, sectionLayout } from '../layout';
import { createSection, createSectionContent } from '../section';
import { colors, fonts } from '../theme';
import { createButton, createPill, createText } from '../ui';
import { createHeroPreview } from './hero-preview';

/** Creates the playground introduction and its primary actions. */
export function createHero(onExplore: () => void): fk.Frame {
  const section = createSection('Hero', sectionLayout.hero, colors.ink);
  const content = createSectionContent();

  content.addChild(
    createPill(
      'GAME UI THINKING  ·  WEB NATIVE',
      fk.udim2FromOffset(282, 36),
      fk.udim2FromOffset(0, 54),
      colors.mint,
    ),
  );
  content.addChild(
    createText({
      text: 'Build the web\nlike a game UI.',
      size: fk.udim2FromOffset(contentWidth, 190),
      position: fk.udim2FromOffset(0, 116),
      textSize: 43,
      weight: 900,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  content.addChild(
    createText({
      text: 'Typed nodes, UDim2 layout, shared values, modifiers, tweens, and springs—without translating every idea into a CSS hierarchy.',
      size: fk.udim2FromOffset(contentWidth, 116),
      position: fk.udim2FromOffset(0, 318),
      color: colors.textMuted,
      textSize: 15,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  const explore = createButton(
    'TRY THE LIVE LAB  ↓',
    fk.udim2FromOffset(172, 50),
    fk.udim2FromOffset(0, 452),
    colors.coral,
    colors.ink,
  );
  bindButtonMotion(explore, colors.coral, colors.amber);
  explore.onClick(onExplore);
  content.addChild(explore);

  const install = createButton(
    'COPY INSTALL',
    fk.udim2FromOffset(172, 50),
    fk.udim2FromOffset(186, 452),
    colors.inkRaised,
    colors.text,
  );
  install.setProperties({ TextSize: 10, FontFamily: fonts.mono });
  bindButtonMotion(install, colors.inkRaised, colors.inkSoft);
  install.onClick(() => void copyCommand(install, 'npm i framekit', 'COPY INSTALL'));
  content.addChild(install);

  content.addChild(createHeroPreview());
  section.addChild(content);
  return section;
}
