import { fk } from 'framekit';

import { bindCardMotion, copyCommand } from '../../shared/interaction';
import { button, decorate, text } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { sectionLayout } from '../layout';
import {
  contentWidth,
  createSection,
  createSectionContent,
  appendSectionHeading,
} from '../primitives';

export function createPrinciples(): fk.FrameNode {
  const section = createSection('MobilePrinciples', sectionLayout.principles, colors.paper);
  const content = createSectionContent();
  appendSectionHeading(
    content,
    'A SMALL SYSTEM.\nREAL BUILDING BLOCKS.',
    'Every concept has one job and one visible place in the tree.',
    true,
  );
  const items = [
    [
      '01',
      'Typed nodes',
      'Create frames, labels, buttons, images, and scrolling surfaces with one predictable property model.',
      'fk.createFrame({ ... })',
      colors.coral,
    ],
    [
      '02',
      'Composable modifiers',
      'Append corners, strokes, padding, scale, constraints, and layouts as element-less nodes.',
      'fk.append(card, corner)',
      colors.mint,
    ],
    [
      '03',
      'Owned behavior',
      'Events, observations, springs, and tweens release automatically when their node is destroyed.',
      'fk.destroy(card)',
      colors.violet,
    ],
  ] as const;
  for (const [index, [number, titleValue, body, snippet, accent]] of items.entries()) {
    const card = fk.createFrame({
      Size: fk.udim2FromOffset(contentWidth, 262),
      Position: fk.udim2FromOffset(0, 236 + index * 282),
      BackgroundColor3: colors.paperRaised,
    });
    decorate(card, 20, colors.paperMuted, 2);
    bindCardMotion(card, index % 2 === 0 ? -0.8 : 0.8, 1.02);
    fk.append(
      card,
      text({
        text: number,
        size: fk.udim2FromOffset(54, 32),
        position: fk.udim2FromOffset(20, 18),
        color: accent,
        textSize: 11,
        font: fonts.mono,
        weight: 800,
      }),
    );
    fk.append(
      card,
      text({
        text: titleValue,
        size: fk.udim2FromOffset(310, 42),
        position: fk.udim2FromOffset(20, 58),
        color: colors.darkText,
        textSize: 22,
        weight: 850,
      }),
    );
    fk.append(
      card,
      text({
        text: body,
        size: fk.udim2FromOffset(318, 84),
        position: fk.udim2FromOffset(20, 108),
        color: colors.darkMuted,
        textSize: 13,
        wrapped: true,
        yAlignment: 'Top',
      }),
    );
    const copy = button(
      snippet,
      fk.udim2FromOffset(318, 44),
      fk.udim2FromOffset(20, 198),
      colors.ink,
      accent,
    );
    fk.update(copy, { TextSize: 10, FontFamily: fonts.mono });
    fk.on(
      copy,
      'MouseButton1Click',
      () => void copyCommand(copy, snippet, snippet, colors.ink, accent),
    );
    fk.append(card, copy);
    fk.append(content, card);
  }
  fk.append(section, content);
  return section;
}
