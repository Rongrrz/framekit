import { fk } from 'framekit';

import { bindButtonMotion, bindScaleMotion, copyCommand } from '../../shared/interaction';
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

type ApiGroup = 'nodes' | 'modifiers' | 'state' | 'motion';

const { top, height } = sectionLayout.api;
const apiGroups: readonly ApiGroup[] = ['nodes', 'modifiers', 'state', 'motion'];
const groups = {
  nodes: {
    index: '01 / NODES',
    title: 'Build a typed tree.',
    body: 'Factories return opaque handles. Compose them explicitly, inspect them, and own their complete lifecycle.',
    accent: colors.coral,
    tokens: ['createFrame', 'createTextBox', 'props', 'append'],
    lines: [
      'const editor = fk.createTextBox({',
      "  Text: 'Hello <b>world</b>',",
      '  RichText: true, MultiLine: true,',
      '});',
      'editor.onTextChanged(save);',
    ],
  },
  modifiers: {
    index: '02 / MODIFIERS',
    title: 'Style by composition.',
    body: 'Corners, strokes, shadows, glows, padding, scale, constraints, and layout are element-less nodes with ordinary lifetimes.',
    accent: colors.violet,
    tokens: ['createUICorner', 'createUIStroke', 'createUIShadow', 'createUIGlow'],
    lines: [
      'const glow = fk.createUIGlow({',
      '  Color: fk.color3(174, 145, 255),',
      '  Radius: 24,',
      '});',
      'fk.append(panel, glow);',
    ],
  },
  state: {
    index: '03 / STATE',
    title: 'Keep state direct.',
    body: 'Explicit observable values are synchronous and framework-free. Owned observations clean themselves up.',
    accent: colors.mint,
    tokens: ['state.observable', 'state.observe', 'state.signal', 'get / set'],
    lines: [
      'const count = fk.state.observable(0);',
      'count.set(1);',
      'fk.state.observe(label, count, value =>',
      '  fk.update(label, { Text: `${value}` })',
      ');',
    ],
  },
  motion: {
    index: '04 / MOTION',
    title: 'Move any value.',
    body: 'Springs retarget continuously. Tweens offer explicit playback. Property ownership prevents competing animations.',
    accent: colors.amber,
    tokens: ['spring', 'createTween', 'tweenInfo', 'createMotion'],
    lines: [
      'fk.spring(card, {',
      '  Size: fk.udim2FromOffset(360, 220),',
      '  Rotation: 3,',
      '});',
      '',
    ],
  },
} as const;

export function createApi(): fk.FrameNode {
  const section = pageSection('Api', top, height, colors.ink);
  const content = sectionContent();
  const selected = fk.state.observable<ApiGroup>('nodes');

  fk.append(
    content,
    createText({
      text: 'ONE ENTRY POINT.\nA SYSTEM YOU CAN EXPLORE.',
      size: scaledSize(680, 130, contentWidth, height),
      position: scaledPosition(0, 58, contentWidth, height),
      textSize: 40,
      weight: 900,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  fk.append(
    content,
    createText({
      text: 'Choose an API area to inspect real functions and a working usage pattern.',
      size: scaledSize(380, 84, contentWidth, height),
      position: scaledPosition(740, 76, contentWidth, height),
      color: colors.textMuted,
      textSize: 16,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  const explorer = fk.createFrame({
    Name: 'InteractiveAPIExplorer',
    Size: scaledSize(contentWidth, 548, contentWidth, height),
    Position: scaledPosition(0, 216, contentWidth, height),
    BackgroundColor3: colors.inkRaised,
    ClipsDescendants: true,
  });
  addRoundedBorder(explorer, 24, colors.inkSoft, 2);

  const navigation = fk.createFrame({
    Name: 'APISections',
    Size: fk.udim2FromOffset(318, 548),
    BackgroundColor3: colors.inkRaised,
  });
  fk.append(
    navigation,
    createText({
      text: 'PUBLIC API',
      size: fk.udim2FromOffset(260, 30),
      position: fk.udim2FromOffset(28, 26),
      color: colors.textMuted,
      textSize: 10,
      font: fonts.mono,
      weight: 750,
    }),
  );
  const groupControls = new Map<
    ApiGroup,
    Readonly<{ button: fk.TextButtonNode; label: fk.TextLabelNode }>
  >();
  for (const [index, key] of apiGroups.entries()) {
    const group = groups[key];
    const control = createButton(
      '',
      fk.udim2FromOffset(262, 86),
      fk.udim2FromOffset(28, 72 + index * 100),
      colors.ink,
      colors.textMuted,
    );
    const label = createText({
      text: `${group.index}\n${group.title}`,
      size: fk.udim2FromOffset(226, 60),
      position: fk.udim2FromOffset(18, 13),
      color: colors.textMuted,
      textSize: 11,
      font: fonts.mono,
      wrapped: true,
      yAlignment: 'Center',
    });
    fk.append(control, label);
    bindScaleMotion(control, 1.025);
    control.onClick(() => selected.set(key));
    groupControls.set(key, { button: control, label });
    fk.append(navigation, control);
  }
  fk.append(
    navigation,
    createText({
      text: "import { fk } from 'framekit'",
      size: fk.udim2FromOffset(262, 32),
      position: fk.udim2FromOffset(28, 490),
      color: colors.violet,
      textSize: 10,
      font: fonts.mono,
    }),
  );
  fk.append(explorer, navigation);

  const detail = fk.createFrame({
    Name: 'APIDetail',
    Size: fk.udim2(1, -318, 1, 0),
    Position: fk.udim2FromOffset(318, 0),
    BackgroundColor3: colors.paperRaised,
  });
  const detailIndex = createText({
    text: '',
    size: fk.udim2FromOffset(260, 28),
    position: fk.udim2FromOffset(38, 30),
    color: colors.coral,
    textSize: 10,
    font: fonts.mono,
    weight: 750,
  });
  const detailTitle = createText({
    text: '',
    size: fk.udim2FromOffset(620, 58),
    position: fk.udim2FromOffset(38, 64),
    color: colors.darkText,
    textSize: 30,
    weight: 900,
  });
  const detailBody = createText({
    text: '',
    size: fk.udim2FromOffset(640, 68),
    position: fk.udim2FromOffset(38, 120),
    color: colors.darkMuted,
    textSize: 14,
    wrapped: true,
    yAlignment: 'Top',
  });
  fk.append(detail, detailIndex);
  fk.append(detail, detailTitle);
  fk.append(detail, detailBody);

  const tokenRow = fk.createFrame({
    Name: 'APITokens',
    Size: fk.udim2FromOffset(700, 42),
    Position: fk.udim2FromOffset(38, 202),
    BackgroundTransparency: 1,
  });
  const tokenNodes: fk.TextLabelNode[] = [];
  for (let index = 0; index < 4; index += 1) {
    const token = fk.createTextLabel({
      Size: fk.udim2FromOffset(158, 36),
      BackgroundColor3: colors.paper,
      Text: '',
      TextColor3: colors.darkText,
      TextSize: 10,
      FontFamily: fonts.mono,
      FontWeight: 650,
      LayoutOrder: index,
    });
    fk.append(token, fk.createUICorner({ CornerRadius: 10 }));
    fk.append(tokenRow, token);
    tokenNodes.push(token);
  }
  fk.append(
    tokenRow,
    fk.createUIListLayout({ FillDirection: 'Horizontal', Padding: fk.udim(0, 10) }),
  );
  fk.append(detail, tokenRow);

  const code = fk.createFrame({
    Name: 'APIExample',
    Size: fk.udim2FromOffset(700, 230),
    Position: fk.udim2FromOffset(38, 270),
    BackgroundColor3: colors.ink,
  });
  addRoundedBorder(code, 16, colors.inkSoft);
  const lineNodes = [
    appendCodeLine(code, '', 22, colors.violet),
    appendCodeLine(code, '', 58),
    appendCodeLine(code, '', 94, colors.coral),
    appendCodeLine(code, '', 130),
    appendCodeLine(code, '', 166, colors.mint),
  ];
  const copy = createButton(
    'COPY EXAMPLE',
    fk.udim2FromOffset(132, 34),
    fk.udim2FromOffset(548, 180),
    colors.inkRaised,
    colors.textMuted,
  );
  fk.update(copy, { TextSize: 9, FontFamily: fonts.mono });
  bindButtonMotion(copy, colors.inkRaised, colors.inkSoft);
  fk.append(code, copy);
  fk.append(detail, code);
  fk.append(explorer, detail);

  let currentSnippet = '';
  copy.onClick(() => {
    void copyCommand(copy, currentSnippet, 'COPY EXAMPLE');
  });
  fk.state.observe(detail, selected, (value) => {
    const group = groups[value];
    fk.update(detailIndex, { Text: group.index, TextColor3: group.accent });
    fk.update(detailTitle, { Text: group.title });
    fk.update(detailBody, { Text: group.body });
    for (const [index, token] of tokenNodes.entries()) {
      fk.update(token, {
        Text: group.tokens[index] ?? '',
        Visible: group.tokens[index] !== undefined,
      });
    }
    updateTextLines(lineNodes, group.lines);
    currentSnippet = group.lines.join('\n');
    for (const [key, control] of groupControls) {
      const active = key === value;
      fk.update(control.button, {
        BackgroundColor3: active ? group.accent : colors.ink,
      });
      fk.update(control.label, { TextColor3: active ? colors.ink : colors.textMuted });
    }
  });

  fk.append(content, explorer);
  fk.append(section, content);
  return section;
}
