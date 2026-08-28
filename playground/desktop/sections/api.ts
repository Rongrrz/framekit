import { fk, fkh } from 'framekit';

import { bindButtonMotion, copyCommand } from '../../shared/interaction';
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
    title: 'Build an inspectable hierarchy.',
    body: 'Every persistent node has a Name, ClassName, and live Parent. Traverse it like an engine scene tree or print any subtree while debugging.',
    accent: colors.coral,
    tokens: ['Parent', 'ClassName', 'findFirstChild', 'printTree'],
    lines: [
      'const editor = fk.createTextBox({',
      "  Name: 'Editor', Text: 'Hello',",
      '});',
      'editor.Parent = panel;',
      'panel.printTree();',
    ],
  },
  modifiers: {
    index: '02 / MODIFIERS',
    title: 'Style by composition.',
    body: 'Corners, strokes, shadows, padding, scale, constraints, and layout are element-less nodes with ordinary lifetimes.',
    accent: colors.violet,
    tokens: ['fk.createUICorner', 'fk.createUIStroke', 'fk.createUIShadow', 'fk.createUIPadding'],
    lines: [
      'const shadow = fk.createUIShadow({',
      '  Offset: fk.vector2(0, 8),',
      '  BlurRadius: 24,',
      '});',
      'panel.addChild(shadow);',
    ],
  },
  state: {
    index: '03 / STATE',
    title: 'Keep state direct.',
    body: 'A shared value is optional, synchronous, and explicit. Watching it never rerenders or recreates a node.',
    accent: colors.mint,
    tokens: ['fk.createValue', 'node.watch', 'value.get', 'value.set'],
    lines: [
      'const count = fk.createValue(0);',
      'count.set(1);',
      'label.watch(count, value =>',
      '  label.Text = `${value}`',
      ');',
    ],
  },
  motion: {
    index: '04 / MOTION',
    title: 'Move any value.',
    body: 'Springs retarget continuously. Tweens offer explicit playback. Property ownership prevents competing animations.',
    accent: colors.amber,
    tokens: ['fka.spring', 'fka.createTween', 'SpringController', 'TweenOptions'],
    lines: [
      'fka.spring(card, {',
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

  const selected = fk.createValue<ApiGroup>('nodes');

  content.addChild(
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

  content.addChild(
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

  navigation.addChild(
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
    Readonly<{
      button: fk.TextButtonNode;
      label: fk.TextLabelNode;
    }>
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
    control.addChild(label);
    fkh.bindHoverScale(control, 1.025);
    control.onClick(() => selected.set(key));
    groupControls.set(key, { button: control, label });
    navigation.addChild(control);
  }
  navigation.addChild(
    createText({
      text: "import { fk, fka, fkh } from 'framekit'",
      size: fk.udim2FromOffset(262, 32),
      position: fk.udim2FromOffset(28, 490),
      color: colors.violet,
      textSize: 10,
      font: fonts.mono,
    }),
  );

  explorer.addChild(navigation);

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

  detail.addChild(detailIndex);

  detail.addChild(detailTitle);

  detail.addChild(detailBody);

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
    token.addChild(fk.createUICorner({ CornerRadius: 10 }));
    tokenRow.addChild(token);
    tokenNodes.push(token);
  }
  tokenRow.addChild(
    fk.createUIListLayout({ FillDirection: 'Horizontal', Padding: fk.udim(0, 10) }),
  );

  detail.addChild(tokenRow);

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
  copy.setProperties({ TextSize: 9, FontFamily: fonts.mono });
  bindButtonMotion(copy, colors.inkRaised, colors.inkSoft);

  code.addChild(copy);

  detail.addChild(code);

  explorer.addChild(detail);
  let currentSnippet = '';
  copy.onClick(() => {
    void copyCommand(copy, currentSnippet, 'COPY EXAMPLE');
  });
  detail.watch(selected, (value) => {
    const group = groups[value];
    detailIndex.setProperties({ Text: group.index, TextColor3: group.accent });
    detailTitle.setProperties({ Text: group.title });
    detailBody.setProperties({ Text: group.body });
    for (const [index, token] of tokenNodes.entries()) {
      token.setProperties({
        Text: group.tokens[index] ?? '',
        Visible: group.tokens[index] !== undefined,
      });
    }
    updateTextLines(lineNodes, group.lines);
    currentSnippet = group.lines.join('\n');
    for (const [key, control] of groupControls) {
      const active = key === value;
      control.button.setProperties({
        BackgroundColor3: active ? group.accent : colors.ink,
      });
      control.label.setProperties({ TextColor3: active ? colors.ink : colors.textMuted });
    }
  });

  content.addChild(explorer);

  section.addChild(content);
  return section;
}
