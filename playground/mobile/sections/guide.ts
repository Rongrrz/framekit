import { fk } from 'framekit';

import { bindButtonMotion, bindScaleMotion } from '../../shared/interaction';
import { setModifierAttached } from '../../shared/modifier';
import {
  createButton,
  appendCodeLine,
  addRoundedBorder,
  createText,
  updateTextLines,
} from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { sectionLayout } from '../layout';
import {
  contentWidth,
  createSection,
  createSectionContent,
  appendSectionHeading,
} from '../primitives';

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
      'fk.append(card, corner);',
      'fk.append(card, stroke);',
      '',
      '// Both can be detached later.',
    ],
  },
  {
    tab: '3  CONNECT',
    index: '03 / CONNECT',
    title: 'Connect state.',
    body: 'The button writes an observable value. An owned observation updates the same card.',
    lines: [
      'const online = fk.state.observable(false);',
      'online.set(true);',
      'fk.state.observe(card, online,',
      '  value => updateStatus(value)',
      ');',
    ],
  },
  {
    tab: '4  ANIMATE',
    index: '04 / ANIMATE',
    title: 'Add motion.',
    body: 'The finished card scales on hover through one retained spring.',
    lines: ['card.onMouseEnter(() =>', '  fk.spring(scale, { Scale: 1.04 })', ');'],
  },
] as const;

export function createGuide(): fk.FrameNode {
  const section = createSection('MobileGuide', sectionLayout.guide, colors.paper);
  const content = createSectionContent();
  appendSectionHeading(
    content,
    'ONE WORKING CARD.\nFOUR REAL STEPS.',
    'The preview and code change together so every step has a visible purpose.',
    true,
  );
  const selected = fk.state.observable(0);
  const online = fk.state.observable(false);
  for (const [index, guideStep] of guideSteps.entries()) {
    const control = createButton(
      guideStep.tab,
      fk.udim2FromOffset(172, 48),
      fk.udim2FromOffset((index % 2) * 186, 228 + Math.floor(index / 2) * 62),
      colors.ink,
      colors.text,
    );
    fk.update(control, { TextSize: 9, FontFamily: fonts.mono });
    bindScaleMotion(control, 1.035);
    control.onClick(() => selected.set(index));
    fk.append(content, control);
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
  fk.append(explanation, stepLabel);
  fk.append(explanation, title);
  fk.append(explanation, body);
  fk.append(content, explanation);
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
  fk.append(card, cardScale);
  fk.append(
    card,
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
  fk.append(card, stateButton);
  const hint = createText({
    text: 'HOVER ENABLED',
    size: fk.udim2FromOffset(250, 26),
    position: fk.udim2FromOffset(24, 160),
    color: colors.amber,
    textSize: 9,
    font: fonts.mono,
    xAlignment: 'Center',
  });
  fk.append(card, hint);
  fk.append(preview, card);
  fk.append(content, preview);
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
  fk.append(content, code);
  card.onMouseEnter(() => {
    if (selected.get() === 3) fk.spring(cardScale, { Scale: 1.04 });
  });
  card.onMouseLeave(() => fk.spring(cardScale, { Scale: 1 }));
  fk.state.observe(card, online, (isOnline) => {
    fk.update(stateButton, {
      Text: isOnline ? 'ONLINE  ●' : 'SET ONLINE',
      BackgroundColor3: isOnline ? colors.mint : colors.ink,
      TextColor3: isOnline ? colors.ink : colors.text,
    });
  });
  fk.state.observe(card, selected, (value) => {
    const guideStep = guideSteps[value];
    if (!guideStep) return;
    setModifierAttached(card, corner, value >= 1);
    setModifierAttached(card, stroke, value >= 1);
    fk.update(stateButton, { Visible: value >= 2 });
    fk.update(hint, { Visible: value >= 3 });
    fk.update(stepLabel, { Text: guideStep.index });
    fk.update(title, { Text: guideStep.title });
    fk.update(body, { Text: guideStep.body });
    updateTextLines(lines, guideStep.lines);
  });
  fk.append(section, content);
  return section;
}
