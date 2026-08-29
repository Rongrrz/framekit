import { fk, fka, fkh } from 'framekit';

import { sectionLayout } from '../layout';
import {
  contentWidth,
  createSection,
  createSectionContent,
  appendSectionHeading,
} from '../section';
import { bindButtonMotion } from '../shared/interaction';
import {
  createButton,
  appendCodeLine,
  addRoundedBorder,
  createText,
  updateTextLines,
} from '../shared/ui';
import { colors, fonts } from '../theme';

const guideSteps = [
  {
    tab: '1  CREATE',
    index: '01 / CREATE',
    title: 'Create one node.',
    body: 'The factory gives the profile card an explicit initial size, name, and surface.',
    lines: ['const card = fk.createFrame({', "  Name: 'ProfileCard',", '  Size: cardSize,', '});'],
  },
  {
    tab: '2  DECORATE',
    index: '02 / DECORATE',
    title: 'Attach modifiers.',
    body: 'A corner and outer stroke become inspectable child nodes instead of hidden style rules.',
    lines: [
      'card.addChild(corner);',
      'card.addChild(stroke);',
      '',
      '// Both can be removed and reused later.',
    ],
  },
  {
    tab: '3  CONNECT',
    index: '03 / CONNECT',
    title: 'Connect state.',
    body: 'The button writes a shared value. The card watches it with an ordinary synchronous callback.',
    lines: [
      'const online = fk.createValue(false);',
      'online.set(true);',
      'card.watch(online,',
      '  value => updateStatus(value)',
      ');',
    ],
  },
  {
    tab: '4  ANIMATE',
    index: '04 / ANIMATE',
    title: 'Add motion.',
    body: 'The finished card scales on hover through one retained spring.',
    lines: ['card.onMouseEnter(() =>', '  fka.spring(scale, { Scale: 1.04 })', ');'],
  },
] as const;

export function createGuide(): fk.FrameNode {
  const section = createSection('Guide', sectionLayout.guide, colors.paper);

  const content = createSectionContent();
  appendSectionHeading(
    content,
    'ONE WORKING CARD.\nFOUR REAL STEPS.',
    'The preview and code change together so every step has a visible purpose.',
    true,
  );

  const selected = fk.createValue(0);

  const online = fk.createValue(false);
  for (const [index, guideStep] of guideSteps.entries()) {
    const control = createButton(
      guideStep.tab,
      fk.udim2FromOffset(172, 48),
      fk.udim2FromOffset((index % 2) * 186, 228 + Math.floor(index / 2) * 62),
      colors.ink,
      colors.text,
    );
    control.setProperties({ TextSize: 9, FontFamily: fonts.mono });
    fkh.bindHoverScale(control, 1.035);
    control.onClick(() => selected.set(index));
    content.addChild(control);
  }

  const explanation = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 230),
    Position: fk.udim2FromOffset(0, 366),
    BackgroundColor3: colors.paperRaised,
  });
  addRoundedBorder(explanation, 18, colors.paperMuted, 2);

  const stepLabel = createText({
    text: '',
    size: fk.udim2FromOffset(310, 28),
    position: fk.udim2FromOffset(24, 20),
    color: colors.coral,
    textSize: 10,
    font: fonts.mono,
  });

  const title = createText({
    text: '',
    size: fk.udim2FromOffset(310, 48),
    position: fk.udim2FromOffset(24, 54),
    color: colors.darkText,
    textSize: 23,
    weight: 900,
  });

  const body = createText({
    text: '',
    size: fk.udim2FromOffset(310, 92),
    position: fk.udim2FromOffset(24, 108),
    color: colors.darkMuted,
    textSize: 13,
    wrapped: true,
    yAlignment: 'Top',
  });

  explanation.addChild(stepLabel);

  explanation.addChild(title);

  explanation.addChild(body);

  content.addChild(explanation);

  const preview = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 292),
    Position: fk.udim2FromOffset(0, 626),
    BackgroundColor3: colors.inkRaised,
  });
  addRoundedBorder(preview, 20, colors.inkSoft);

  const card = fk.createFrame({
    Size: fk.udim2FromOffset(298, 202),
    Position: fk.udim2FromOffset(30, 44),
    BackgroundColor3: colors.paperMuted,
  });

  const corner = fk.createUICorner({ CornerRadius: 22 });

  const stroke = fk.createUIStroke({
    Color: colors.violet,
    Thickness: 3,
    BorderStrokePosition: 'Outer',
  });

  const cardScale = fk.createUIScale();

  card.addChild(cardScale);

  card.addChild(
    createText({
      text: 'PROFILE CARD',
      size: fk.udim2FromOffset(250, 42),
      position: fk.udim2FromOffset(24, 20),
      color: colors.darkText,
      textSize: 21,
      weight: 900,
    }),
  );

  const stateButton = createButton(
    'SET ONLINE',
    fk.udim2FromOffset(250, 46),
    fk.udim2FromOffset(24, 106),
    colors.ink,
    colors.text,
  );
  bindButtonMotion(stateButton, colors.ink, colors.mint);
  stateButton.onClick(() => online.update((current) => !current));

  card.addChild(stateButton);

  const hint = createText({
    text: 'HOVER ENABLED',
    size: fk.udim2FromOffset(250, 26),
    position: fk.udim2FromOffset(24, 160),
    color: colors.amber,
    textSize: 9,
    font: fonts.mono,
    xAlignment: 'Center',
  });

  card.addChild(hint);

  preview.addChild(card);

  content.addChild(preview);

  const code = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 320),
    Position: fk.udim2FromOffset(0, 948),
    BackgroundColor3: colors.ink,
  });
  addRoundedBorder(code, 16, colors.inkSoft);

  const lines = [
    appendCodeLine(code, '', 24, colors.violet),
    appendCodeLine(code, '', 66),
    appendCodeLine(code, '', 108, colors.coral),
    appendCodeLine(code, '', 150),
    appendCodeLine(code, '', 192, colors.mint),
    appendCodeLine(code, '', 234),
  ];
  content.addChild(code);
  card.onMouseEnter(() => {
    if (selected.get() === 3) fka.spring(cardScale, { Scale: 1.04 });
  });
  card.onMouseLeave(() => fka.spring(cardScale, { Scale: 1 }));
  card.watch(online, (isOnline) => {
    stateButton.setProperties({
      Text: isOnline ? 'ONLINE  ●' : 'SET ONLINE',
      BackgroundColor3: isOnline ? colors.mint : colors.ink,
      TextColor3: isOnline ? colors.ink : colors.text,
    });
  });
  card.watch(selected, (value) => {
    const guideStep = guideSteps[value];
    if (!guideStep) return;
    fkh.setModifierAttached(card, corner, value >= 1);
    fkh.setModifierAttached(card, stroke, value >= 1);
    stateButton.setProperties({ Visible: value >= 2 });
    hint.setProperties({ Visible: value >= 3 });
    stepLabel.setProperties({ Text: guideStep.index });
    title.setProperties({ Text: guideStep.title });
    body.setProperties({ Text: guideStep.body });
    updateTextLines(lines, guideStep.lines);
  });

  section.addChild(content);
  return section;
}
