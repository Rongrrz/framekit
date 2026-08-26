import { fk } from 'framekit';

import { bindScaleMotion } from '../../shared/interaction';
import { button, codeLine, decorate, text } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { sectionLayout } from '../layout';
import {
  contentWidth,
  createSection,
  createSectionContent,
  appendSectionHeading,
} from '../primitives';

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
  const tabs = ['NODES', 'MODIFIERS', 'STATE', 'MOTION'] as const;
  for (const [index, label] of tabs.entries()) {
    const control = button(
      label,
      fk.udim2FromOffset(172, 44),
      fk.udim2FromOffset((index % 2) * 186, 226 + Math.floor(index / 2) * 58),
      colors.inkRaised,
      colors.text,
    );
    fk.update(control, { TextSize: 9, FontFamily: fonts.mono });
    bindScaleMotion(control, 1.035);
    fk.on(control, 'MouseButton1Click', () => selected(index));
    fk.append(content, control);
  }
  const detail = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 794),
    Position: fk.udim2FromOffset(0, 358),
    BackgroundColor3: colors.paperRaised,
  });
  decorate(detail, 22, colors.inkSoft, 2);
  const indexLabel = text({
    text: '',
    size: fk.udim2FromOffset(310, 28),
    position: fk.udim2FromOffset(24, 24),
    color: colors.coral,
    textSize: 10,
    font: fonts.mono,
  });
  const title = text({
    text: '',
    size: fk.udim2FromOffset(310, 48),
    position: fk.udim2FromOffset(24, 62),
    color: colors.darkText,
    textSize: 25,
    weight: 900,
  });
  const body = text({
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
  const tokens = text({
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
  decorate(code, 16, colors.inkSoft);
  const lines = [
    codeLine(code, '', 24, colors.violet),
    codeLine(code, '', 68),
    codeLine(code, '', 112, colors.coral),
    codeLine(code, '', 156),
    codeLine(code, '', 200, colors.mint),
    codeLine(code, '', 244),
    codeLine(code, '', 288, colors.violet),
  ];
  fk.append(detail, code);
  fk.append(content, detail);
  fk.state.observe(detail, selected, (value) => {
    const data = [
      [
        '01 / NODES',
        'Build the tree.',
        'Factories return typed handles. append(), detach(), and destroy() make ownership explicit.',
        'createFrame  ·  append\nchildren  ·  destroy',
        [
          'const panel = fk.createFrame({',
          "  Name: 'Inventory',",
          '  Size: fk.udim2FromOffset(',
          '    320, 220',
          '  ),',
          '});',
          'fk.append(screen, panel);',
        ],
      ],
      [
        '02 / MODIFIERS',
        'Compose appearance.',
        'Corners, strokes, padding, scale, constraints, and layout are element-less child nodes.',
        'createUICorner  ·  createUIStroke\ncreateUIPadding  ·  createUIListLayout',
        [
          'const corner = fk.createUICorner({',
          '  CornerRadius: 18,',
          '});',
          '',
          'fk.append(panel, corner);',
          'fk.detach(corner);',
          '',
        ],
      ],
      [
        '03 / STATE',
        'Connect behavior.',
        'Callable observable values remain framework-free. Owned observations stop automatically on destroy.',
        'state.observable  ·  state.observe\nstate.signal  ·  on',
        [
          'const count = fk.state.observable(0);',
          '',
          'fk.state.observe(label, count,',
          '  value => fk.update(label, {',
          '    Text: String(value),',
          '  })',
          ');',
        ],
      ],
      [
        '04 / MOTION',
        'Animate values.',
        'Springs retarget continuously. Tweens provide explicit playback over the same typed properties.',
        'createMotion  ·  createTween\ntweenInfo  ·  completed',
        [
          'const motion = fk.createMotion(card);',
          '',
          'motion.spring({',
          '  Position: nextPosition,',
          '  Rotation: 3,',
          '});',
          '',
        ],
      ],
    ] as const;
    const item = data[value]!;
    fk.update(indexLabel, { Text: item[0] });
    fk.update(title, { Text: item[1] });
    fk.update(body, { Text: item[2] });
    fk.update(tokens, { Text: item[3] });
    for (const [index, line] of lines.entries()) fk.update(line, { Text: item[4][index]! });
  });
  fk.append(section, content);
  return section;
}
