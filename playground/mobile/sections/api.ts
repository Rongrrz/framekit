import { fk } from 'framekit';

import { bindScaleMotion } from '../../shared/interaction';
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
    title: 'Build the tree.',
    body: 'Factories return typed handles. append(), detach(), and destroy() make ownership explicit.',
    tokens: 'createTextBox  ·  props\nonTextChanged  ·  RichText',
    lines: [
      'const editor = fk.createTextBox({',
      "  Text: 'Hello <b>world</b>',",
      '  RichText: true,',
      '  MultiLine: true,',
      '});',
      'editor.onTextChanged(save);',
      '',
    ],
  },
  {
    tab: 'MODIFIERS',
    index: '02 / MODIFIERS',
    title: 'Compose appearance.',
    body: 'Corners, strokes, shadows, glows, padding, scale, constraints, and layout are element-less child nodes.',
    tokens: 'createUIShadow  ·  createUIGlow\ncreateUIStroke  ·  createUICorner',
    lines: [
      'const glow = fk.createUIGlow({',
      '  Color: colors.violet,',
      '  Radius: 24,',
      '});',
      'fk.append(panel, glow);',
      '',
      '',
    ],
  },
  {
    tab: 'STATE',
    index: '03 / STATE',
    title: 'Connect behavior.',
    body: 'Explicit observable values remain framework-free. Owned observations stop automatically on destroy.',
    tokens: 'state.observable  ·  state.observe\nstate.signal  ·  get / set',
    lines: [
      'const count = fk.state.observable(0);',
      'count.set(1);',
      'fk.state.observe(label, count,',
      '  value => fk.update(label, {',
      '    Text: String(value),',
      '  })',
      ');',
    ],
  },
  {
    tab: 'MOTION',
    index: '04 / MOTION',
    title: 'Animate values.',
    body: 'Springs retarget continuously. Tweens provide explicit playback over the same typed properties.',
    tokens: 'spring  ·  createTween\ntweenInfo  ·  createMotion',
    lines: ['fk.spring(card, {', '  Position: nextPosition,', '  Rotation: 3,', '});'],
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
  const selected = fk.state.observable(0);
  for (const [index, apiSection] of apiSections.entries()) {
    const control = createButton(
      apiSection.tab,
      fk.udim2FromOffset(172, 44),
      fk.udim2FromOffset((index % 2) * 186, 226 + Math.floor(index / 2) * 58),
      colors.inkRaised,
      colors.text,
    );
    fk.update(control, { TextSize: 9, FontFamily: fonts.mono });
    bindScaleMotion(control, 1.035);
    control.onClick(() => selected.set(index));
    fk.append(content, control);
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
  fk.append(detail, indexLabel);
  fk.append(detail, title);
  fk.append(detail, body);
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
  fk.append(detail, tokens);
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
  fk.append(detail, code);
  fk.append(content, detail);
  fk.state.observe(detail, selected, (value) => {
    const apiSection = apiSections[value];
    if (!apiSection) return;
    fk.update(indexLabel, { Text: apiSection.index });
    fk.update(title, { Text: apiSection.title });
    fk.update(body, { Text: apiSection.body });
    fk.update(tokens, { Text: apiSection.tokens });
    updateTextLines(lines, apiSection.lines);
  });
  fk.append(section, content);
  return section;
}
