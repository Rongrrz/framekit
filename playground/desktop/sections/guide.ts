import { fk } from 'framekit';

import { bindButtonMotion, bindScaleMotion } from '../../shared/interaction';
import { setModifierAttached } from '../../shared/modifier';
import { button, codeLine, decorate, text } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { contentWidth, pageSection, scaledPosition, scaledSize, sectionContent } from '../geometry';
import { sectionLayout } from '../layout';

type GuideStep = 'create' | 'decorate' | 'connect' | 'animate';

const { top, height } = sectionLayout.guide;
const guide = {
  create: {
    number: '01',
    label: 'CREATE THE NODE',
    heading: 'Start with one explicit object.',
    body: 'The factory returns a typed handle whose initial properties describe a plain profile card.',
    accent: colors.coral,
    lines: [
      'const card = fk.createFrame({',
      "  Name: 'ProfileCard',",
      '  Size: fk.udim2FromOffset(380, 240),',
      '  BackgroundColor3: surface,',
      '});',
    ],
  },
  decorate: {
    number: '02',
    label: 'COMPOSE MODIFIERS',
    heading: 'Appearance becomes part of the tree.',
    body: 'Attach a corner and outer stroke. They can be updated, detached, or destroyed like other nodes.',
    accent: colors.violet,
    lines: [
      'fk.append(card, fk.createUICorner({',
      '  CornerRadius: 24,',
      '}));',
      'fk.append(card, outerStroke);',
      '',
    ],
  },
  connect: {
    number: '03',
    label: 'CONNECT STATE',
    heading: 'Let one value drive the interface.',
    body: 'A callable observable stores availability. The owned observation updates both label and color.',
    accent: colors.mint,
    lines: [
      'const online = fk.state.observable(false);',
      '',
      'fk.state.observe(card, online, value => {',
      '  fk.update(status, statusProps(value));',
      '});',
    ],
  },
  animate: {
    number: '04',
    label: 'ADD MOTION',
    heading: 'Retarget the same properties on input.',
    body: 'Hover the finished preview. One retained controller carries scale and rotation smoothly between goals.',
    accent: colors.amber,
    lines: [
      'const motion = fk.createMotion(scale);',
      '',
      "fk.on(card, 'MouseEnter', () =>",
      '  motion.spring({ Scale: 1.04 })',
      ');',
    ],
  },
} as const;

export function createGuide(): fk.FrameNode {
  const section = pageSection('BuildGuide', top, height, colors.paper);
  const content = sectionContent();
  const step = fk.state.observable<GuideStep>('create');
  const online = fk.state.observable(false);

  fk.append(
    content,
    text({
      text: 'BUILD ONE REAL INTERACTION,\nSTEP BY STEP.',
      size: scaledSize(690, 128, contentWidth, height),
      position: scaledPosition(0, 58, contentWidth, height),
      color: colors.darkText,
      textSize: 40,
      weight: 900,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  fk.append(
    content,
    text({
      text: 'This is the complete FrameKit loop: create a node, compose modifiers, connect state, then add motion to the same property model.',
      size: scaledSize(400, 110, contentWidth, height),
      position: scaledPosition(720, 72, contentWidth, height),
      color: colors.darkMuted,
      textSize: 16,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  const lab = fk.createFrame({
    Name: 'GuidedBuild',
    Size: scaledSize(contentWidth, 676, contentWidth, height),
    Position: scaledPosition(0, 224, contentWidth, height),
    BackgroundColor3: colors.ink,
    ClipsDescendants: true,
  });
  decorate(lab, 26, colors.darkText, 2);

  const navigation = fk.createFrame({
    Name: 'GuideSteps',
    Size: fk.udim2FromOffset(350, 676),
    BackgroundColor3: colors.inkRaised,
  });
  fk.append(
    navigation,
    text({
      text: 'SELECT A BUILD STEP',
      size: fk.udim2FromOffset(294, 30),
      position: fk.udim2FromOffset(28, 26),
      color: colors.textMuted,
      textSize: 10,
      font: fonts.mono,
      weight: 750,
    }),
  );
  const stepButtons = new Map<GuideStep, fk.TextButtonNode>();
  const stepLabels = new Map<GuideStep, fk.TextLabelNode>();
  for (const [index, key] of (Object.keys(guide) as GuideStep[]).entries()) {
    const item = guide[key];
    const control = button(
      '',
      fk.udim2FromOffset(294, 92),
      fk.udim2FromOffset(28, 74 + index * 106),
      colors.ink,
      colors.text,
    );
    const label = text({
      text: `${item.number}\n${item.label}`,
      size: fk.udim2FromOffset(250, 58),
      position: fk.udim2FromOffset(20, 17),
      color: colors.textMuted,
      textSize: 11,
      font: fonts.mono,
      wrapped: true,
    });
    fk.append(control, label);
    bindScaleMotion(control, 1.025);
    fk.on(control, 'MouseButton1Click', () => step(key));
    stepButtons.set(key, control);
    stepLabels.set(key, label);
    fk.append(navigation, control);
  }
  fk.append(
    navigation,
    text({
      text: 'Each step changes the actual preview and its corresponding code.',
      size: fk.udim2FromOffset(294, 70),
      position: fk.udim2FromOffset(28, 524),
      color: colors.textMuted,
      textSize: 12,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  fk.append(lab, navigation);

  const stage = fk.createFrame({
    Name: 'GuideStage',
    Size: fk.udim2(1, -350, 1, 0),
    Position: fk.udim2FromOffset(350, 0),
    BackgroundColor3: colors.paperRaised,
  });
  const stepIndex = text({
    text: '',
    size: fk.udim2FromOffset(180, 28),
    position: fk.udim2FromOffset(40, 28),
    color: colors.coral,
    textSize: 10,
    font: fonts.mono,
    weight: 750,
  });
  const heading = text({
    text: '',
    size: fk.udim2FromOffset(650, 54),
    position: fk.udim2FromOffset(40, 62),
    color: colors.darkText,
    textSize: 28,
    weight: 900,
  });
  const body = text({
    text: '',
    size: fk.udim2FromOffset(650, 62),
    position: fk.udim2FromOffset(40, 112),
    color: colors.darkMuted,
    textSize: 14,
    wrapped: true,
    yAlignment: 'Top',
  });
  fk.append(stage, stepIndex);
  fk.append(stage, heading);
  fk.append(stage, body);

  const previewArea = fk.createFrame({
    Name: 'GuidePreviewArea',
    Size: fk.udim2FromOffset(360, 422),
    Position: fk.udim2FromOffset(40, 206),
    BackgroundColor3: colors.paper,
  });
  decorate(previewArea, 18, colors.paperMuted);
  fk.append(
    previewArea,
    text({
      text: 'LIVE RESULT',
      size: fk.udim2FromOffset(300, 28),
      position: fk.udim2FromOffset(24, 18),
      color: colors.darkMuted,
      textSize: 9,
      font: fonts.mono,
      weight: 750,
    }),
  );
  const card = fk.createFrame({
    Name: 'ProfileCard',
    Size: fk.udim2FromOffset(294, 266),
    Position: fk.udim2FromOffset(32, 72),
    BackgroundColor3: colors.paperMuted,
  });
  const cardCorner = fk.createUICorner({ CornerRadius: 24 });
  const cardStroke = fk.createUIStroke({
    Color: colors.violet,
    Thickness: 3,
    BorderStrokePosition: 'Outer',
  });
  const cardScale = fk.createUIScale();
  fk.append(card, cardScale);
  const avatar = fk.createTextLabel({
    Size: fk.udim2FromOffset(58, 58),
    Position: fk.udim2FromOffset(24, 24),
    BackgroundColor3: colors.coral,
    Text: 'FK',
    TextColor3: colors.ink,
    TextSize: 18,
    FontFamily: fonts.sans,
    FontWeight: 900,
  });
  fk.append(avatar, fk.createUICorner({ CornerRadius: 18 }));
  fk.append(card, avatar);
  fk.append(
    card,
    text({
      text: 'FRAME BUILDER',
      size: fk.udim2FromOffset(170, 36),
      position: fk.udim2FromOffset(98, 22),
      color: colors.darkText,
      textSize: 17,
      weight: 850,
    }),
  );
  fk.append(
    card,
    text({
      text: 'Typed UI engineer',
      size: fk.udim2FromOffset(170, 28),
      position: fk.udim2FromOffset(98, 58),
      color: colors.darkMuted,
      textSize: 12,
    }),
  );
  const stateButton = button(
    'SET ONLINE',
    fk.udim2FromOffset(246, 48),
    fk.udim2FromOffset(24, 154),
    colors.ink,
    colors.text,
  );
  bindButtonMotion(stateButton, colors.ink, colors.mint);
  fk.on(stateButton, 'MouseButton1Click', () => online((value) => !value));
  fk.append(card, stateButton);
  const hoverHint = text({
    text: 'HOVER THE FINISHED CARD  ↗',
    size: fk.udim2FromOffset(246, 28),
    position: fk.udim2FromOffset(24, 216),
    color: colors.darkMuted,
    textSize: 9,
    font: fonts.mono,
    xAlignment: 'Center',
  });
  fk.append(card, hoverHint);
  fk.append(previewArea, card);
  fk.append(stage, previewArea);

  const code = fk.createFrame({
    Name: 'GuideCode',
    Size: fk.udim2FromOffset(338, 422),
    Position: fk.udim2FromOffset(426, 206),
    BackgroundColor3: colors.ink,
  });
  decorate(code, 18, colors.inkSoft);
  fk.append(
    code,
    text({
      text: 'CURRENT STEP',
      size: fk.udim2FromOffset(290, 28),
      position: fk.udim2FromOffset(22, 18),
      color: colors.textMuted,
      textSize: 9,
      font: fonts.mono,
      weight: 750,
    }),
  );
  const codeRows = [
    codeLine(code, '', 66, colors.violet),
    codeLine(code, '', 106),
    codeLine(code, '', 146, colors.coral),
    codeLine(code, '', 186),
    codeLine(code, '', 226, colors.mint),
  ];
  for (const row of codeRows) fk.update(row, { TextSize: 11 });
  fk.append(
    code,
    text({
      text: 'The preview is not a mockup. It is built and updated by the code pattern shown here.',
      size: fk.udim2FromOffset(294, 80),
      position: fk.udim2FromOffset(22, 316),
      color: colors.textMuted,
      textSize: 12,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  fk.append(stage, code);
  fk.append(lab, stage);

  const scaleMotion = fk.createMotion(cardScale, { tension: 250, friction: 21 });
  const cardMotion = fk.createMotion(card, { tension: 240, friction: 22 });
  fk.on(card, 'MouseEnter', () => {
    if (step() !== 'animate') return;
    scaleMotion.spring({ Scale: 1.04 });
    cardMotion.spring({ Rotation: -1.5 });
  });
  fk.on(card, 'MouseLeave', () => {
    scaleMotion.spring({ Scale: 1 });
    cardMotion.spring({ Rotation: 0 });
  });
  fk.state.observe(card, online, (value) => {
    fk.update(stateButton, {
      Text: value ? 'ONLINE  ●' : 'SET ONLINE',
      BackgroundColor3: value ? colors.mint : colors.ink,
      TextColor3: value ? colors.ink : colors.text,
    });
  });
  fk.state.observe(card, step, (value) => {
    const item = guide[value];
    const index = (Object.keys(guide) as GuideStep[]).indexOf(value);
    const decorated = index >= 1;
    const connected = index >= 2;
    const animated = index >= 3;
    setModifierAttached(card, cardCorner, decorated);
    setModifierAttached(card, cardStroke, decorated);
    fk.update(stateButton, { Visible: connected });
    fk.update(hoverHint, { Visible: animated });
    fk.update(card, { BackgroundColor3: decorated ? colors.paperRaised : colors.paperMuted });
    fk.update(stepIndex, { Text: `${item.number} / 04`, TextColor3: item.accent });
    fk.update(heading, { Text: item.heading });
    fk.update(body, { Text: item.body });
    for (const [lineIndex, row] of codeRows.entries())
      fk.update(row, { Text: item.lines[lineIndex]! });
    for (const [key, control] of stepButtons) {
      const active = key === value;
      fk.update(control, { BackgroundColor3: active ? item.accent : colors.ink });
      fk.update(stepLabels.get(key)!, { TextColor3: active ? colors.ink : colors.textMuted });
    }
  });

  fk.append(content, lab);
  fk.append(section, content);
  return section;
}
