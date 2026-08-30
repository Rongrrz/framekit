import { fk } from 'framekit';

import { copyCommand } from '../behaviors/copy-button';
import { bindButtonMotion } from '../behaviors/hover-motion';
import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { createSection, createSectionContent } from '../section';
import { colors, fonts } from '../theme';
import { addRoundedBorder, createButton, createText } from '../ui';

export function createFooter(
  layout: fk.Value<PlaygroundLayout>,
  onBackToTop: () => void,
): fk.Frame {
  const section = createSection('footer', layout, colors.coral);
  const content = createSectionContent(section, layout);
  const card = fk.createFrame({ BackgroundColor3: colors.paper, Rotation: -1 });
  addRoundedBorder(card, 24, colors.ink, 3);
  bindLayoutProperties(section, layout, card, {
    desktop: {
      Size: fk.udim2FromOffset(1080, 330),
      Position: fk.udim2FromOffset(0, 54),
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 446),
      Position: fk.udim2FromOffset(0, 52),
    },
  });

  const title = createText({
    text: 'BUILD WITH THE\nMENTAL MODEL\nYOU ALREADY KNOW.',
    size: fk.udim2FromOffset(310, 178),
    position: fk.udim2FromOffset(24, 28),
    color: colors.darkText,
    textSize: 32,
    weight: 900,
    wrapped: true,
    yAlignment: 'Top',
  });
  const description = createText({
    text: 'Explicit instances. Direct properties. Motion without bookkeeping.',
    size: fk.udim2FromOffset(310, 76),
    position: fk.udim2FromOffset(24, 216),
    color: colors.darkMuted,
    textSize: 14,
    wrapped: true,
    yAlignment: 'Top',
  });
  bindLayoutProperties(section, layout, title, {
    desktop: {
      Size: fk.udim2FromOffset(540, 160),
      Position: fk.udim2FromOffset(40, 38),
      TextSize: 42,
    },
    mobile: {
      Size: fk.udim2FromOffset(310, 178),
      Position: fk.udim2FromOffset(24, 28),
      TextSize: 32,
    },
  });
  bindLayoutProperties(section, layout, description, {
    desktop: {
      Size: fk.udim2FromOffset(500, 62),
      Position: fk.udim2FromOffset(40, 226),
      TextSize: 16,
    },
    mobile: {
      Size: fk.udim2FromOffset(310, 76),
      Position: fk.udim2FromOffset(24, 216),
      TextSize: 14,
    },
  });

  const source = createButton(
    'VIEW SOURCE  ↗',
    fk.udim2FromOffset(310, 52),
    fk.udim2FromOffset(24, 310),
    colors.ink,
    colors.text,
  );
  const install = createButton(
    'COPY  npm i framekit',
    fk.udim2FromOffset(310, 44),
    fk.udim2FromOffset(24, 378),
    colors.paperMuted,
    colors.darkText,
  );
  install.setProperties({ TextSize: 10, FontFamily: fonts.mono });
  bindButtonMotion(source, colors.ink, colors.violet);
  source.onClick(() => {
    window.open('https://github.com/Rongrrz/framekit', '_blank', 'noopener,noreferrer');
  });
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
  bindLayoutProperties(section, layout, source, {
    desktop: {
      Size: fk.udim2FromOffset(390, 58),
      Position: fk.udim2FromOffset(650, 96),
    },
    mobile: {
      Size: fk.udim2FromOffset(310, 52),
      Position: fk.udim2FromOffset(24, 310),
    },
  });
  bindLayoutProperties(section, layout, install, {
    desktop: {
      Size: fk.udim2FromOffset(390, 50),
      Position: fk.udim2FromOffset(650, 178),
    },
    mobile: {
      Size: fk.udim2FromOffset(310, 44),
      Position: fk.udim2FromOffset(24, 378),
    },
  });

  card.addChild(title);
  card.addChild(description);
  card.addChild(source);
  card.addChild(install);
  content.addChild(card);

  const back = createButton(
    'BACK TO TOP  ↑',
    fk.udim2FromOffset(150, 42),
    fk.udim2FromOffset(208, 536),
    colors.coral,
    colors.ink,
  );
  const signature = createText({
    text: 'FRAMEKIT  /  2026',
    size: fk.udim2FromOffset(180, 42),
    position: fk.udim2FromOffset(0, 536),
    color: colors.ink,
    textSize: 10,
    font: fonts.mono,
    weight: 800,
  });
  bindButtonMotion(back, colors.coral, colors.amber);
  back.onClick(onBackToTop);
  bindLayoutProperties(section, layout, back, {
    desktop: { Position: fk.udim2FromOffset(930, 410) },
    mobile: { Position: fk.udim2FromOffset(208, 536) },
  });
  bindLayoutProperties(section, layout, signature, {
    desktop: { Position: fk.udim2FromOffset(0, 410) },
    mobile: { Position: fk.udim2FromOffset(0, 536) },
  });
  content.addChild(back);
  content.addChild(signature);
  section.addChild(content);
  return section;
}
