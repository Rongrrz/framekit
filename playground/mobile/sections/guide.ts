import { fk } from 'framekit';

import { bindButtonMotion, bindScaleMotion } from '../../shared/interaction';
import { setModifierAttached } from '../../shared/modifier';
import { button, codeLine, decorate, text } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { sectionLayout } from '../layout';
import {
  contentWidth,
  createSection,
  createSectionContent,
  appendSectionHeading,
} from '../primitives';

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
  const labels = ['1  CREATE', '2  DECORATE', '3  CONNECT', '4  ANIMATE'] as const;
  for (const [index, label] of labels.entries()) {
    const control = button(
      label,
      fk.udim2FromOffset(172, 48),
      fk.udim2FromOffset((index % 2) * 186, 228 + Math.floor(index / 2) * 62),
      colors.ink,
      colors.text,
    );
    fk.update(control, { TextSize: 9, FontFamily: fonts.mono });
    bindScaleMotion(control, 1.035);
    fk.on(control, 'MouseButton1Click', () => selected(index));
    fk.append(content, control);
  }
  const explanation = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 230),
    Position: fk.udim2FromOffset(0, 366),
    BackgroundColor3: colors.paperRaised,
  });
  decorate(explanation, 18, colors.paperMuted, 2);
  const stepLabel = text({
    text: '',
    size: fk.udim2FromOffset(310, 28),
    position: fk.udim2FromOffset(24, 20),
    color: colors.coral,
    textSize: 10,
    font: fonts.mono,
  });
  const title = text({
    text: '',
    size: fk.udim2FromOffset(310, 48),
    position: fk.udim2FromOffset(24, 54),
    color: colors.darkText,
    textSize: 23,
    weight: 900,
  });
  const body = text({
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
  decorate(preview, 20, colors.inkSoft);
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
    text({
      text: 'PROFILE CARD',
      size: fk.udim2FromOffset(250, 42),
      position: fk.udim2FromOffset(24, 20),
      color: colors.darkText,
      textSize: 21,
      weight: 900,
    }),
  );
  const stateButton = button(
    'SET ONLINE',
    fk.udim2FromOffset(250, 46),
    fk.udim2FromOffset(24, 106),
    colors.ink,
    colors.text,
  );
  bindButtonMotion(stateButton, colors.ink, colors.mint);
  fk.append(card, stateButton);
  const hint = text({
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
  decorate(code, 16, colors.inkSoft);
  const lines = [
    codeLine(code, '', 24, colors.violet),
    codeLine(code, '', 66),
    codeLine(code, '', 108, colors.coral),
    codeLine(code, '', 150),
    codeLine(code, '', 192, colors.mint),
    codeLine(code, '', 234),
  ];
  fk.append(content, code);
  fk.on(card, 'MouseEnter', () => {
    if (selected() === 3) fk.spring(cardScale, { Scale: 1.04 });
  });
  fk.on(card, 'MouseLeave', () => fk.spring(cardScale, { Scale: 1 }));
  fk.state.observe(card, selected, (value) => {
    const data = [
      [
        '01 / CREATE',
        'Create one node.',
        'The factory gives the profile card an explicit initial size, name, and surface.',
        [
          'const card = fk.createFrame({',
          "  Name: 'ProfileCard',",
          '  Size: cardSize,',
          '});',
          '',
          '',
        ],
      ],
      [
        '02 / DECORATE',
        'Attach modifiers.',
        'A corner and outer stroke become inspectable child nodes instead of hidden style rules.',
        [
          'fk.append(card, corner);',
          'fk.append(card, stroke);',
          '',
          '// Both can be detached later.',
          '',
          '',
        ],
      ],
      [
        '03 / CONNECT',
        'Connect state.',
        'The button writes an observable value. An owned observation updates the same card.',
        [
          'const online = fk.state.observable(false);',
          '',
          'fk.state.observe(card, online,',
          '  value => updateStatus(value)',
          ');',
          '',
        ],
      ],
      [
        '04 / ANIMATE',
        'Add motion.',
        'The finished card scales on hover through one retained spring.',
        [
          "fk.on(card, 'MouseEnter', () =>",
          '  fk.spring(scale, { Scale: 1.04 })',
          ');',
          '',
          '',
          '',
        ],
      ],
    ] as const;
    const item = data[value]!;
    setModifierAttached(card, corner, value >= 1);
    setModifierAttached(card, stroke, value >= 1);
    fk.update(stateButton, { Visible: value >= 2 });
    fk.update(hint, { Visible: value >= 3 });
    fk.update(stepLabel, { Text: item[0] });
    fk.update(title, { Text: item[1] });
    fk.update(body, { Text: item[2] });
    for (const [index, line] of lines.entries()) fk.update(line, { Text: item[3][index]! });
  });
  fk.append(section, content);
  return section;
}
