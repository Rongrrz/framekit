import { fk, fkh } from 'framekit';

import { contentWidth } from '../layout';
import { colors, fonts } from '../theme';
import { createButton, appendCodeLine, addRoundedBorder, createText, updateTextLines } from '../ui';

const apiTopics = [
  {
    tab: 'NODES',
    index: '01 / NODES',
    title: 'Inspect the hierarchy.',
    body: 'Every persistent node has a Name, ClassName, and live Parent. Traverse or print any subtree without touching the DOM.',
    tokens: 'Parent  ·  ClassName\nfindFirstChild  ·  printTree',
    lines: [
      'const editor = fk.createTextBox({',
      "  Name: 'Editor',",
      "  Text: 'Hello',",
      '});',
      'editor.Parent = panel;',
      "panel.findFirstChild('Editor');",
      'panel.printTree();',
    ],
  },
  {
    tab: 'MODIFIERS',
    index: '02 / MODIFIERS',
    title: 'Compose appearance.',
    body: 'Corners, strokes, shadows, padding, scale, constraints, and layout are element-less child nodes.',
    tokens: 'fk.createUIShadow  ·  fk.createUIPadding\nfk.createUIStroke  ·  fk.createUICorner',
    lines: [
      'const shadow = fk.createUIShadow({',
      '  Offset: fk.vector2(0, 8),',
      '  BlurRadius: 24,',
      '});',
      'panel.addChild(shadow);',
      '',
      '',
    ],
  },
  {
    tab: 'STATE',
    index: '03 / STATE',
    title: 'Connect behavior.',
    body: 'Shared values are optional and synchronous. Watching one never rerenders or recreates a node.',
    tokens: 'fk.createValue  ·  node.watch\nvalue.get  ·  value.set',
    lines: [
      'const count = fk.createValue(0);',
      'count.set(1);',
      'label.watch(count,',
      '  value => label.Text = String(value)',
      '',
      '',
      ');',
    ],
  },
  {
    tab: 'MOTION',
    index: '04 / MOTION',
    title: 'Animate values.',
    body: 'Springs retarget continuously. Tweens provide explicit playback over the same typed properties.',
    tokens: 'fka.spring  ·  fka.createTween\nSpringController  ·  TweenOptions',
    lines: ['fka.spring(card, {', '  Position: nextPosition,', '  Rotation: 3,', '});'],
  },
] as const;

/** Creates the tabbed API explanation and code explorer. */
export function createApiExplorer(): fk.FrameNode {
  const explorer = fk.createFrame({
    Name: 'ApiExplorer',
    Size: fk.udim2FromOffset(contentWidth, 926),
    Position: fk.udim2FromOffset(0, 226),
    BackgroundTransparency: 1,
  });
  const selectedTopic = fk.createValue(0);

  for (const [index, topic] of apiTopics.entries()) {
    const control = createButton(
      topic.tab,
      fk.udim2FromOffset(172, 44),
      fk.udim2FromOffset((index % 2) * 186, Math.floor(index / 2) * 58),
      colors.inkRaised,
      colors.text,
    );
    control.setProperties({ TextSize: 9, FontFamily: fonts.mono });
    fkh.bindHoverScale(control, 1.035);
    control.onClick(() => selectedTopic.set(index));
    explorer.addChild(control);
  }

  const detail = fk.createFrame({
    Name: 'ApiTopic',
    Size: fk.udim2FromOffset(contentWidth, 794),
    Position: fk.udim2FromOffset(0, 132),
    BackgroundColor3: colors.paperRaised,
  });
  addRoundedBorder(detail, 22, colors.inkSoft, 2);

  const indexLabel = createText({
    text: '',
    size: fk.udim2FromOffset(310, 28),
    position: fk.udim2FromOffset(24, 24),
    color: colors.coral,
    textSize: 10,
    font: fonts.mono,
  });
  const title = createText({
    text: '',
    size: fk.udim2FromOffset(310, 48),
    position: fk.udim2FromOffset(24, 62),
    color: colors.darkText,
    textSize: 25,
    weight: 900,
  });
  const body = createText({
    text: '',
    size: fk.udim2FromOffset(310, 104),
    position: fk.udim2FromOffset(24, 116),
    color: colors.darkMuted,
    textSize: 13,
    wrapped: true,
    yAlignment: 'Top',
  });
  const tokens = createText({
    text: '',
    size: fk.udim2FromOffset(310, 88),
    position: fk.udim2FromOffset(24, 238),
    color: colors.darkText,
    textSize: 10,
    font: fonts.mono,
    wrapped: true,
    yAlignment: 'Top',
  });

  detail.addChild(indexLabel);
  detail.addChild(title);
  detail.addChild(body);
  detail.addChild(tokens);

  const code = fk.createFrame({
    Size: fk.udim2FromOffset(310, 400),
    Position: fk.udim2FromOffset(24, 356),
    BackgroundColor3: colors.ink,
  });
  addRoundedBorder(code, 16, colors.inkSoft);
  const lines = [
    appendCodeLine(code, '', 24, colors.violet),
    appendCodeLine(code, '', 68),
    appendCodeLine(code, '', 112, colors.coral),
    appendCodeLine(code, '', 156),
    appendCodeLine(code, '', 200, colors.mint),
    appendCodeLine(code, '', 244),
    appendCodeLine(code, '', 288, colors.violet),
  ];

  detail.addChild(code);
  explorer.addChild(detail);
  explorer.watch(selectedTopic, (topicIndex) => {
    const topic = apiTopics[topicIndex];
    if (!topic) return;

    indexLabel.Text = topic.index;
    title.Text = topic.title;
    body.Text = topic.body;
    tokens.Text = topic.tokens;
    updateTextLines(lines, topic.lines);
  });

  return explorer;
}
