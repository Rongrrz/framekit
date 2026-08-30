import { fk, fka, fkh } from 'framekit';

import { bindButtonMotion } from '../behaviors/hover-motion';
import { contentWidth } from '../layout';
import { colors, fonts } from '../theme';
import { createButton, appendCodeLine, addRoundedBorder, createText, updateTextLines } from '../ui';

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

/** Creates the interactive four-step profile-card walkthrough. */
export function createGuideDemo(): fk.FrameNode {
  const demo = fk.createFrame({
    Name: 'GuideDemo',
    Size: fk.udim2FromOffset(contentWidth, 1040),
    Position: fk.udim2FromOffset(0, 228),
    BackgroundTransparency: 1,
  });
  const selectedStep = fk.createValue(0);
  const online = fk.createValue(false);

  for (const [index, step] of guideSteps.entries()) {
    const control = createButton(
      step.tab,
      fk.udim2FromOffset(172, 48),
      fk.udim2FromOffset((index % 2) * 186, Math.floor(index / 2) * 62),
      colors.ink,
      colors.text,
    );
    control.setProperties({ TextSize: 9, FontFamily: fonts.mono });
    fkh.bindHoverScale(control, 1.035);
    control.onClick(() => selectedStep.set(index));
    demo.addChild(control);
  }

  const explanation = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 230),
    Position: fk.udim2FromOffset(0, 138),
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
  demo.addChild(explanation);

  const preview = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 292),
    Position: fk.udim2FromOffset(0, 398),
    BackgroundColor3: colors.inkRaised,
  });
  addRoundedBorder(preview, 20, colors.inkSoft);
  const card = fk.createFrame({
    Name: 'ProfileCard',
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
  demo.addChild(preview);

  const code = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 320),
    Position: fk.udim2FromOffset(0, 720),
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
  demo.addChild(code);

  card.onMouseEnter(() => {
    if (selectedStep.get() === 3) fka.spring(cardScale, { Scale: 1.04 });
  });
  card.onMouseLeave(() => fka.spring(cardScale, { Scale: 1 }));
  card.watch(online, (isOnline) => {
    stateButton.setProperties({
      Text: isOnline ? 'ONLINE  ●' : 'SET ONLINE',
      BackgroundColor3: isOnline ? colors.mint : colors.ink,
      TextColor3: isOnline ? colors.ink : colors.text,
    });
  });
  card.watch(selectedStep, (stepIndex) => {
    const step = guideSteps[stepIndex];
    if (!step) return;
    fkh.setModifierAttached(card, corner, stepIndex >= 1);
    fkh.setModifierAttached(card, stroke, stepIndex >= 1);
    stateButton.Visible = stepIndex >= 2;
    hint.Visible = stepIndex >= 3;
    stepLabel.Text = step.index;
    title.Text = step.title;
    body.Text = step.body;
    updateTextLines(lines, step.lines);
  });

  return demo;
}
