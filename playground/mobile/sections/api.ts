import { fk, fkh } from 'framekit';

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

const apiSections = [
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

export function createApi(): fk.FrameNode {
  const section = createSection('MobileApi', sectionLayout.api, colors.ink);

  const content = createSectionContent();
  appendSectionHeading(
    content,
    'THE PUBLIC API,\nWITHOUT THE DUMP.',
    'Pick an area. Each panel explains what it owns and shows a complete, formatted usage pattern.',
    false,
  );

  const selected = fk.createValue(0);
  for (const [index, apiSection] of apiSections.entries()) {
    const control = createButton(
      apiSection.tab,
      fk.udim2FromOffset(172, 44),
      fk.udim2FromOffset((index % 2) * 186, 226 + Math.floor(index / 2) * 58),
      colors.inkRaised,
      colors.text,
    );
    control.setProperties({ TextSize: 9, FontFamily: fonts.mono });
    fkh.bindHoverScale(control, 1.035);
    control.onClick(() => selected.set(index));
    content.addChild(control);
  }

  const detail = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 794),
    Position: fk.udim2FromOffset(0, 358),
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

  detail.addChild(indexLabel);

  detail.addChild(title);

  detail.addChild(body);

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

  content.addChild(detail);
  detail.watch(selected, (value) => {
    const apiSection = apiSections[value];
    if (!apiSection) return;
    indexLabel.setProperties({ Text: apiSection.index });
    title.setProperties({ Text: apiSection.title });
    body.setProperties({ Text: apiSection.body });
    tokens.setProperties({ Text: apiSection.tokens });
    updateTextLines(lines, apiSection.lines);
  });

  section.addChild(content);
  return section;
}
