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
import { contentWidth, pageSection, scaledPosition, scaledSize, sectionContent } from '../geometry';
import { sectionLayout } from '../layout';

type GuideStep = 'create' | 'decorate' | 'connect' | 'animate';

const { top, height } = sectionLayout.guide;

const guideSteps: readonly GuideStep[] = ['create', 'decorate', 'connect', 'animate'];

const guide = {
  create: {
    number: '01',
    label: 'CREATE THE NODE',
    heading: 'Start with one explicit object.',
    body: 'The factory returns a persistent typed node whose initial properties describe a plain profile card.',
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
      'card.addChild(fk.createUICorner({',
      '  CornerRadius: 24,',
      '}));',
      'card.addChild(outerStroke);',
      '',
    ],
  },
  connect: {
    number: '03',
    label: 'CONNECT STATE',
    heading: 'Let one value drive the interface.',
    body: 'A shared value stores availability. The card watches it with one ordinary synchronous callback.',
    accent: colors.mint,
    lines: [
      'const online = fk.createValue(false);',
      'online.set(true);',
      'card.watch(online, value => {',
      '  status.setProperties(statusProps(value));',
      '});',
    ],
  },
  animate: {
    number: '04',
    label: 'ADD MOTION',
    heading: 'Retarget the same properties on input.',
    body: 'Hover the finished preview. FrameKit retains scale and rotation springs between goals.',
    accent: colors.amber,
    lines: ['card.onMouseEnter(() =>', '  fk.spring(scale, { Scale: 1.04 })', ');', '', ''],
  },
} as const;

export function createGuide(): fk.FrameNode {
  const section = pageSection('BuildGuide', top, height, colors.paper);

  const content = sectionContent();

  const selectedStepKey = fk.createValue<GuideStep>('create');

  const online = fk.createValue(false);

  content.addChild(
    createText({
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

  content.addChild(
    createText({
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
  addRoundedBorder(lab, 26, colors.darkText, 2);

  const navigation = fk.createFrame({
    Name: 'GuideSteps',
    Size: fk.udim2FromOffset(350, 676),
    BackgroundColor3: colors.inkRaised,
  });

  navigation.addChild(
    createText({
      text: 'SELECT A BUILD STEP',
      size: fk.udim2FromOffset(294, 30),
      position: fk.udim2FromOffset(28, 26),
      color: colors.textMuted,
      textSize: 10,
      font: fonts.mono,
      weight: 750,
    }),
  );

  const stepControls = new Map<
    GuideStep,
    Readonly<{
      button: fk.TextButtonNode;
      label: fk.TextLabelNode;
    }>
  >();
  for (const [index, key] of guideSteps.entries()) {
    const stepContent = guide[key];
    const control = createButton(
      '',
      fk.udim2FromOffset(294, 92),
      fk.udim2FromOffset(28, 74 + index * 106),
      colors.ink,
      colors.text,
    );
    const label = createText({
      text: `${stepContent.number}\n${stepContent.label}`,
      size: fk.udim2FromOffset(250, 58),
      position: fk.udim2FromOffset(20, 17),
      color: colors.textMuted,
      textSize: 11,
      font: fonts.mono,
      wrapped: true,
    });
    control.addChild(label);
    bindScaleMotion(control, 1.025);
    control.onClick(() => selectedStepKey.set(key));
    stepControls.set(key, { button: control, label });
    navigation.addChild(control);
  }
  navigation.addChild(
    createText({
      text: 'Each step changes the actual preview and its corresponding code.',
      size: fk.udim2FromOffset(294, 70),
      position: fk.udim2FromOffset(28, 524),
      color: colors.textMuted,
      textSize: 12,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  lab.addChild(navigation);

  const stage = fk.createFrame({
    Name: 'GuideStage',
    Size: fk.udim2(1, -350, 1, 0),
    Position: fk.udim2FromOffset(350, 0),
    BackgroundColor3: colors.paperRaised,
  });

  const stepIndex = createText({
    text: '',
    size: fk.udim2FromOffset(180, 28),
    position: fk.udim2FromOffset(40, 28),
    color: colors.coral,
    textSize: 10,
    font: fonts.mono,
    weight: 750,
  });

  const heading = createText({
    text: '',
    size: fk.udim2FromOffset(650, 54),
    position: fk.udim2FromOffset(40, 62),
    color: colors.darkText,
    textSize: 28,
    weight: 900,
  });

  const body = createText({
    text: '',
    size: fk.udim2FromOffset(650, 62),
    position: fk.udim2FromOffset(40, 112),
    color: colors.darkMuted,
    textSize: 14,
    wrapped: true,
    yAlignment: 'Top',
  });

  stage.addChild(stepIndex);

  stage.addChild(heading);

  stage.addChild(body);

  const previewArea = fk.createFrame({
    Name: 'GuidePreviewArea',
    Size: fk.udim2FromOffset(360, 422),
    Position: fk.udim2FromOffset(40, 206),
    BackgroundColor3: colors.paper,
  });
  addRoundedBorder(previewArea, 18, colors.paperMuted);

  previewArea.addChild(
    createText({
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

  card.addChild(cardScale);

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

  avatar.addChild(fk.createUICorner({ CornerRadius: 18 }));

  card.addChild(avatar);

  card.addChild(
    createText({
      text: 'FRAME BUILDER',
      size: fk.udim2FromOffset(170, 36),
      position: fk.udim2FromOffset(98, 22),
      color: colors.darkText,
      textSize: 17,
      weight: 850,
    }),
  );

  card.addChild(
    createText({
      text: 'Typed UI engineer',
      size: fk.udim2FromOffset(170, 28),
      position: fk.udim2FromOffset(98, 58),
      color: colors.darkMuted,
      textSize: 12,
    }),
  );

  const stateButton = createButton(
    'SET ONLINE',
    fk.udim2FromOffset(246, 48),
    fk.udim2FromOffset(24, 154),
    colors.ink,
    colors.text,
  );
  bindButtonMotion(stateButton, colors.ink, colors.mint);
  stateButton.onClick(() => online.update((value) => !value));

  card.addChild(stateButton);

  const hoverHint = createText({
    text: 'HOVER THE FINISHED CARD  ↗',
    size: fk.udim2FromOffset(246, 28),
    position: fk.udim2FromOffset(24, 216),
    color: colors.darkMuted,
    textSize: 9,
    font: fonts.mono,
    xAlignment: 'Center',
  });

  card.addChild(hoverHint);

  previewArea.addChild(card);

  stage.addChild(previewArea);

  const code = fk.createFrame({
    Name: 'GuideCode',
    Size: fk.udim2FromOffset(338, 422),
    Position: fk.udim2FromOffset(426, 206),
    BackgroundColor3: colors.ink,
  });
  addRoundedBorder(code, 18, colors.inkSoft);

  code.addChild(
    createText({
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
    appendCodeLine(code, '', 66, colors.violet),
    appendCodeLine(code, '', 106),
    appendCodeLine(code, '', 146, colors.coral),
    appendCodeLine(code, '', 186),
    appendCodeLine(code, '', 226, colors.mint),
  ];
  for (const row of codeRows) row.setProperties({ TextSize: 11 });

  code.addChild(
    createText({
      text: 'The preview is not a mockup. It is built and updated by the code pattern shown here.',
      size: fk.udim2FromOffset(294, 80),
      position: fk.udim2FromOffset(22, 316),
      color: colors.textMuted,
      textSize: 12,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  stage.addChild(code);

  lab.addChild(stage);
  card.onMouseEnter(() => {
    if (selectedStepKey.get() !== 'animate') return;
    fk.spring(cardScale, { Scale: 1.04 });
    fk.spring(card, { Rotation: -1.5 });
  });
  card.onMouseLeave(() => {
    fk.spring(cardScale, { Scale: 1 });
    fk.spring(card, { Rotation: 0 });
  });
  card.watch(online, (value) => {
    stateButton.setProperties({
      Text: value ? 'ONLINE  ●' : 'SET ONLINE',
      BackgroundColor3: value ? colors.mint : colors.ink,
      TextColor3: value ? colors.ink : colors.text,
    });
  });
  card.watch(selectedStepKey, (value) => {
    const selectedStep = guide[value];
    const index = guideSteps.indexOf(value);
    const decorated = index >= 1;
    const connected = index >= 2;
    const animated = index >= 3;
    setModifierAttached(card, cardCorner, decorated);
    setModifierAttached(card, cardStroke, decorated);
    stateButton.setProperties({ Visible: connected });
    hoverHint.setProperties({ Visible: animated });
    card.setProperties({ BackgroundColor3: decorated ? colors.paperRaised : colors.paperMuted });
    stepIndex.setProperties({
      Text: `${selectedStep.number} / 04`,
      TextColor3: selectedStep.accent,
    });
    heading.setProperties({ Text: selectedStep.heading });
    body.setProperties({ Text: selectedStep.body });
    updateTextLines(codeRows, selectedStep.lines);
    for (const [key, control] of stepControls) {
      const active = key === value;
      control.button.setProperties({
        BackgroundColor3: active ? selectedStep.accent : colors.ink,
      });
      control.label.setProperties({ TextColor3: active ? colors.ink : colors.textMuted });
    }
  });

  content.addChild(lab);

  section.addChild(content);
  return section;
}
