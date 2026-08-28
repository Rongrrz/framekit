import { fk } from 'framekit';

import { bindCardMotion, copyCommand } from '../../shared/interaction';
import { createButton, addRoundedBorder, createText } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { sectionLayout } from '../layout';
import {
  contentWidth,
  createSection,
  createSectionContent,
  appendSectionHeading,
} from '../primitives';

const principles = [
  {
    number: '01',
    title: 'Typed nodes',
    body: 'Create frames, labels, buttons, images, and scrolling surfaces with one predictable property model.',
    snippet: 'fk.createFrame({ ... })',
    accent: colors.coral,
  },
  {
    number: '02',
    title: 'Composable modifiers',
    body: 'Append corners, strokes, padding, scale, constraints, and layouts as element-less nodes.',
    snippet: 'fk.append(card, corner)',
    accent: colors.mint,
  },
  {
    number: '03',
    title: 'Owned behavior',
    body: 'Events, observations, springs, and tweens release automatically when their node is destroyed.',
    snippet: 'fk.destroy(card)',
    accent: colors.violet,
  },
] as const;

export function createPrinciples(): fk.FrameNode {
  const section = createSection('MobilePrinciples', sectionLayout.principles, colors.paper);
  const content = createSectionContent();
  appendSectionHeading(
    content,
    'A SMALL SYSTEM.\nREAL BUILDING BLOCKS.',
    'Every concept has one job and one visible place in the tree.',
    true,
  );
  for (const [index, principle] of principles.entries()) {
    const card = fk.createFrame({
      Size: fk.udim2FromOffset(contentWidth, 262),
      Position: fk.udim2FromOffset(0, 236 + index * 282),
      BackgroundColor3: colors.paperRaised,
    });
    addRoundedBorder(card, 20, colors.paperMuted, 2);
    bindCardMotion(card, index % 2 === 0 ? -0.8 : 0.8, 1.02);
    fk.append(
      card,
      createText({
        text: principle.number,
        size: fk.udim2FromOffset(54, 32),
        position: fk.udim2FromOffset(20, 18),
        color: principle.accent,
        textSize: 11,
        font: fonts.mono,
        weight: 800,
      }),
    );
    fk.append(
      card,
      createText({
        text: principle.title,
        size: fk.udim2FromOffset(310, 42),
        position: fk.udim2FromOffset(20, 58),
        color: colors.darkText,
        textSize: 22,
        weight: 850,
      }),
    );
    fk.append(
      card,
      createText({
        text: principle.body,
        size: fk.udim2FromOffset(318, 84),
        position: fk.udim2FromOffset(20, 108),
        color: colors.darkMuted,
        textSize: 13,
        wrapped: true,
        yAlignment: 'Top',
      }),
    );
    const copy = createButton(
      principle.snippet,
      fk.udim2FromOffset(318, 44),
      fk.udim2FromOffset(20, 198),
      colors.ink,
      principle.accent,
    );
    fk.update(copy, { TextSize: 10, FontFamily: fonts.mono });
    copy.onClick(
      () =>
        void copyCommand(copy, principle.snippet, principle.snippet, colors.ink, principle.accent),
    );
    fk.append(card, copy);
    fk.append(content, card);
  }
  fk.append(section, content);
  return section;
}
