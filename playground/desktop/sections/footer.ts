import { fk } from 'framekit';

import { bindButtonMotion, copyCommand } from '../../shared/interaction';
import { button, decorate, text } from '../../shared/ui';
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
  decorate(callout, 28, colors.ink, 3);
  fk.append(
    callout,
    text({
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
  fk.append(
    callout,
    text({
      text: 'Build with the layout values, node tree, and motion model you already understand.',
      size: fk.udim2FromOffset(590, 84),
      position: fk.udim2FromOffset(44, 232),
      color: colors.darkMuted,
      textSize: 18,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  const start = button(
    'START WITH FRAMEKIT  ↗',
    fk.udim2FromOffset(282, 58),
    fk.udim2FromOffset(790, 176),
    colors.ink,
    colors.text,
  );
  bindButtonMotion(start, colors.ink, colors.violet);
  fk.on(start, 'MouseButton1Click', () => {
    window.open('https://github.com/Rongrrz/framekit', '_blank', 'noopener,noreferrer');
  });
  fk.append(callout, start);
  const install = button(
    'COPY INSTALL COMMAND',
    fk.udim2FromOffset(282, 46),
    fk.udim2FromOffset(790, 246),
    colors.paperMuted,
    colors.darkText,
  );
  fk.update(install, { TextSize: 10, FontFamily: fonts.mono });
  bindButtonMotion(install, colors.paperMuted, colors.mint);
  fk.on(install, 'MouseButton1Click', () => {
    void copyCommand(
      install,
      'npm i framekit',
      'COPY INSTALL COMMAND',
      colors.paperMuted,
      colors.darkText,
    );
  });
  fk.append(callout, install);
  fk.append(
    callout,
    text({
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
  fk.append(content, callout);

  fk.append(
    content,
    text({
      text: 'FRAMEKIT  /  2026',
      size: scaledSize(300, 40, contentWidth, height),
      position: scaledPosition(0, 554, contentWidth, height),
      color: colors.ink,
      textSize: 12,
      font: fonts.mono,
      weight: 800,
    }),
  );
  const back = button(
    'BACK TO TOP  ↑',
    scaledSize(170, 40, contentWidth, height),
    scaledPosition(950, 550, contentWidth, height),
    colors.coral,
    colors.ink,
  );
  bindButtonMotion(back, colors.coral, colors.amber);
  fk.on(back, 'MouseButton1Click', onBackToTop);
  fk.append(content, back);

  fk.append(section, content);
  return section;
}
