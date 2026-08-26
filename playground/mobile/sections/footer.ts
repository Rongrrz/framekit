import { fk } from 'framekit';

import { bindButtonMotion, copyCommand } from '../../shared/interaction';
import { button, decorate, text } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { sectionLayout } from '../layout';
import { contentWidth, createSection, createSectionContent } from '../primitives';

export function createFooter(onBackToTop: () => void): fk.FrameNode {
  const section = createSection('MobileFooter', sectionLayout.footer, colors.coral);
  const content = createSectionContent();
  const card = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 486),
    Position: fk.udim2FromOffset(0, 54),
    BackgroundColor3: colors.paper,
    Rotation: -1,
  });
  decorate(card, 24, colors.ink, 3);
  fk.append(
    card,
    text({
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
  fk.append(
    card,
    text({
      text: 'Typed nodes. Explicit trees. Direct state. Motion without bookkeeping.',
      size: fk.udim2FromOffset(310, 76),
      position: fk.udim2FromOffset(24, 224),
      color: colors.darkMuted,
      textSize: 14,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  const source = button(
    'VIEW SOURCE  ↗',
    fk.udim2FromOffset(310, 52),
    fk.udim2FromOffset(24, 326),
    colors.ink,
    colors.text,
  );
  bindButtonMotion(source, colors.ink, colors.violet);
  fk.on(source, 'MouseButton1Click', () =>
    window.open('https://github.com/Rongrrz/framekit', '_blank', 'noopener,noreferrer'),
  );
  fk.append(card, source);
  const install = button(
    'COPY  npm i framekit',
    fk.udim2FromOffset(310, 44),
    fk.udim2FromOffset(24, 394),
    colors.paperMuted,
    colors.darkText,
  );
  fk.update(install, { TextSize: 10, FontFamily: fonts.mono });
  fk.on(
    install,
    'MouseButton1Click',
    () =>
      void copyCommand(
        install,
        'npm i framekit',
        'COPY  npm i framekit',
        colors.paperMuted,
        colors.darkText,
      ),
  );
  fk.append(card, install);
  fk.append(content, card);
  const back = button(
    'BACK TO TOP  ↑',
    fk.udim2FromOffset(150, 42),
    fk.udim2FromOffset(208, 574),
    colors.coral,
    colors.ink,
  );
  bindButtonMotion(back, colors.coral, colors.amber);
  fk.on(back, 'MouseButton1Click', onBackToTop);
  fk.append(content, back);
  fk.append(
    content,
    text({
      text: 'FRAMEKIT  /  2026',
      size: fk.udim2FromOffset(180, 42),
      position: fk.udim2FromOffset(0, 574),
      color: colors.ink,
      textSize: 10,
      font: fonts.mono,
      weight: 800,
    }),
  );
  fk.append(section, content);
  return section;
}
