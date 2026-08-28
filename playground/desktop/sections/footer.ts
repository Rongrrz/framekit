import { fk } from 'framekit';

import { bindButtonMotion, copyCommand } from '../../shared/interaction';
import { createButton, addRoundedBorder, createText } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { contentWidth, pageSection, scaledPosition, scaledSize, sectionContent } from '../geometry';
import { sectionLayout } from '../layout';

const { top, height } = sectionLayout.footer;

export function createFooter(onBackToTop: () => void): fk.FrameNode {
  const section = pageSection('Footer', top, height, colors.coral);

  const content = sectionContent();

  const callout = fk.createFrame({
    Name: 'FinalCallout',
    Size: scaledSize(contentWidth, 410, contentWidth, height),
    Position: scaledPosition(0, 54, contentWidth, height),
    BackgroundColor3: colors.paper,
    Rotation: -1,
  });
  addRoundedBorder(callout, 28, colors.ink, 3);

  callout.addChild(
    createText({
      text: 'STOP TRANSLATING\nYOUR IDEAS INTO CSS.',
      size: fk.udim2FromOffset(650, 164),
      position: fk.udim2FromOffset(42, 42),
      color: colors.darkText,
      textSize: 44,
      weight: 900,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  callout.addChild(
    createText({
      text: 'Build with the layout values, node tree, and motion model you already understand.',
      size: fk.udim2FromOffset(590, 84),
      position: fk.udim2FromOffset(44, 232),
      color: colors.darkMuted,
      textSize: 18,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  const start = createButton(
    'START WITH FRAMEKIT  ↗',
    fk.udim2FromOffset(282, 58),
    fk.udim2FromOffset(790, 176),
    colors.ink,
    colors.text,
  );
  bindButtonMotion(start, colors.ink, colors.violet);
  start.onClick(() => {
    window.open('https://github.com/Rongrrz/framekit', '_blank', 'noopener,noreferrer');
  });

  callout.addChild(start);

  const install = createButton(
    'COPY INSTALL COMMAND',
    fk.udim2FromOffset(282, 46),
    fk.udim2FromOffset(790, 246),
    colors.paperMuted,
    colors.darkText,
  );
  install.setProperties({ TextSize: 10, FontFamily: fonts.mono });
  bindButtonMotion(install, colors.paperMuted, colors.mint);
  install.onClick(() => {
    void copyCommand(
      install,
      'npm i framekit',
      'COPY INSTALL COMMAND',
      colors.paperMuted,
      colors.darkText,
    );
  });

  callout.addChild(install);

  callout.addChild(
    createText({
      text: 'TypeScript  •  Browser DOM  •  Zero runtime dependencies',
      size: fk.udim2FromOffset(330, 64),
      position: fk.udim2FromOffset(758, 304),
      color: colors.darkMuted,
      textSize: 11,
      font: fonts.mono,
      wrapped: true,
      xAlignment: 'Center',
    }),
  );

  content.addChild(callout);

  content.addChild(
    createText({
      text: 'FRAMEKIT  /  2026',
      size: scaledSize(300, 40, contentWidth, height),
      position: scaledPosition(0, 554, contentWidth, height),
      color: colors.ink,
      textSize: 12,
      font: fonts.mono,
      weight: 800,
    }),
  );

  const back = createButton(
    'BACK TO TOP  ↑',
    scaledSize(170, 40, contentWidth, height),
    scaledPosition(950, 550, contentWidth, height),
    colors.coral,
    colors.ink,
  );
  bindButtonMotion(back, colors.coral, colors.amber);
  back.onClick(onBackToTop);

  content.addChild(back);

  section.addChild(content);
  return section;
}
