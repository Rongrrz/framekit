import { fk } from 'framekit';

import { bindCardMotion, copyCommand } from '../../shared/interaction';
import { button, decorate, text } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { contentWidth, pageSection, scaledPosition, scaledSize, sectionContent } from '../geometry';
import { sectionLayout } from '../layout';

const { top, height } = sectionLayout.principles;

const principles = [
  {
    number: '01',
    title: 'Create typed nodes',
    body: 'Factories produce opaque handles with a property contract. Misspelled properties fail early instead of silently becoming broken CSS.',
    code: 'fk.createFrame({ ... })',
    accent: colors.coral,
  },
  {
    number: '02',
    title: 'Compose a real tree',
    body: 'Append controls and element-less modifiers into an explicit hierarchy. Detach to reuse; destroy to release every owned resource.',
    code: 'fk.append(parent, child)',
    accent: colors.mint,
  },
  {
    number: '03',
    title: 'Move with intent',
    body: 'Use springs for interaction and tweens for bounded playback. Both update the same typed properties and arbitrate ownership safely.',
    code: 'fk.spring(node, { ... })',
    accent: colors.violet,
  },
] as const;

export function createPrinciples(): fk.FrameNode {
  const section = pageSection('Principles', top, height, colors.paper);
  const content = sectionContent();

  fk.append(
    content,
    text({
      text: 'A SMALL SYSTEM,\nNOT A NEW LANGUAGE.',
      size: scaledSize(650, 142, contentWidth, height),
      position: scaledPosition(0, 76, contentWidth, height),
      color: colors.darkText,
      textSize: 42,
      weight: 900,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  fk.append(
    content,
    text({
      text: 'FrameKit keeps construction, behavior, state, and motion separate—then gives them one consistent vocabulary.',
      size: scaledSize(390, 100, contentWidth, height),
      position: scaledPosition(730, 86, contentWidth, height),
      color: colors.darkMuted,
      textSize: 17,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  const cards = fk.createFrame({
    Name: 'PrincipleCards',
    Size: scaledSize(contentWidth, 374, contentWidth, height),
    Position: scaledPosition(0, 250, contentWidth, height),
    BackgroundTransparency: 1,
  });
  for (const [index, principle] of principles.entries()) {
    const card = fk.createFrame({
      Name: `Principle${index + 1}`,
      Size: fk.udim2FromOffset(352, 374),
      BackgroundColor3: colors.paperRaised,
      LayoutOrder: index,
    });
    decorate(card, 22, colors.paperMuted, 2);
    bindCardMotion(card, index === 1 ? 1 : -1);
    fk.append(
      card,
      text({
        text: principle.number,
        size: fk.udim2FromOffset(72, 54),
        position: fk.udim2FromOffset(24, 22),
        color: principle.accent,
        textSize: 13,
        font: fonts.mono,
        weight: 800,
      }),
    );
    const icon = fk.createFrame({
      Size: fk.udim2FromOffset(44, 44),
      Position: fk.udim2FromOffset(282, 24),
      BackgroundColor3: principle.accent,
      Rotation: index === 1 ? 45 : 0,
    });
    fk.append(icon, fk.createUICorner({ CornerRadius: index === 2 ? 22 : 12 }));
    fk.append(card, icon);
    fk.append(
      card,
      text({
        text: principle.title,
        size: fk.udim2FromOffset(300, 58),
        position: fk.udim2FromOffset(24, 104),
        color: colors.darkText,
        textSize: 24,
        weight: 850,
      }),
    );
    fk.append(
      card,
      text({
        text: principle.body,
        size: fk.udim2FromOffset(300, 112),
        position: fk.udim2FromOffset(24, 174),
        color: colors.darkMuted,
        textSize: 15,
        wrapped: true,
        yAlignment: 'Top',
      }),
    );
    const copy = button(
      principle.code,
      fk.udim2FromOffset(304, 48),
      fk.udim2FromOffset(24, 302),
      colors.ink,
      principle.accent,
    );
    fk.update(copy, { TextSize: 11, FontFamily: fonts.mono });
    fk.on(copy, 'MouseButton1Click', () => {
      void copyCommand(copy, principle.code, principle.code, colors.ink, principle.accent);
    });
    fk.append(card, copy);
    fk.append(cards, card);
  }
  fk.append(cards, fk.createUIListLayout({ FillDirection: 'Horizontal', Padding: fk.udim(0, 32) }));
  fk.append(content, cards);
  fk.append(section, content);
  return section;
}
