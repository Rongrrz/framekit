import { fk } from 'framekit';

import { sectionLayout } from '../layout';
import { contentWidth, createSection, createSectionContent } from '../section';
import { bindButtonMotion, copyCommand } from '../shared/interaction';
import { createButton, addRoundedBorder, createText } from '../shared/ui';
import { colors, fonts } from '../theme';

export function createFooter(onBackToTop: () => void): fk.FrameNode {
  const section = createSection('Footer', sectionLayout.footer, colors.coral);

  const content = createSectionContent();

  const card = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 486),
    Position: fk.udim2FromOffset(0, 54),
    BackgroundColor3: colors.paper,
    Rotation: -1,
  });
  addRoundedBorder(card, 24, colors.ink, 3);

  card.addChild(
    createText({
      text: 'BUILD WITH THE\nMENTAL MODEL\nYOU ALREADY KNOW.',
      size: fk.udim2FromOffset(310, 178),
      position: fk.udim2FromOffset(24, 28),
      color: colors.darkText,
      textSize: 32,
      weight: 900,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  card.addChild(
    createText({
      text: 'Typed nodes. Explicit trees. Direct state. Motion without bookkeeping.',
      size: fk.udim2FromOffset(310, 76),
      position: fk.udim2FromOffset(24, 224),
      color: colors.darkMuted,
      textSize: 14,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  const source = createButton(
    'VIEW SOURCE  ↗',
    fk.udim2FromOffset(310, 52),
    fk.udim2FromOffset(24, 326),
    colors.ink,
    colors.text,
  );
  bindButtonMotion(source, colors.ink, colors.violet);
  source.onClick(() => {
    window.open('https://github.com/Rongrrz/framekit', '_blank', 'noopener,noreferrer');
  });

  card.addChild(source);

  const install = createButton(
    'COPY  npm i framekit',
    fk.udim2FromOffset(310, 44),
    fk.udim2FromOffset(24, 394),
    colors.paperMuted,
    colors.darkText,
  );
  install.setProperties({ TextSize: 10, FontFamily: fonts.mono });
  install.onClick(
    () =>
      void copyCommand(
        install,
        'npm i framekit',
        'COPY  npm i framekit',
        colors.paperMuted,
        colors.darkText,
      ),
  );

  card.addChild(install);

  content.addChild(card);

  const back = createButton(
    'BACK TO TOP  ↑',
    fk.udim2FromOffset(150, 42),
    fk.udim2FromOffset(208, 574),
    colors.coral,
    colors.ink,
  );
  bindButtonMotion(back, colors.coral, colors.amber);
  back.onClick(onBackToTop);

  content.addChild(back);

  content.addChild(
    createText({
      text: 'FRAMEKIT  /  2026',
      size: fk.udim2FromOffset(180, 42),
      position: fk.udim2FromOffset(0, 574),
      color: colors.ink,
      textSize: 10,
      font: fonts.mono,
      weight: 800,
    }),
  );

  section.addChild(content);
  return section;
}
