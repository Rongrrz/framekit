import { fk } from 'framekit';

import { bindButtonMotion } from '../../shared/interaction';
import { button, codeLine, decorate, text } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { sectionLayout } from '../layout';
import {
  contentWidth,
  createSection,
  createSectionContent,
  appendSectionHeading,
} from '../primitives';

export function createValues(): fk.FrameNode {
  const section = createSection('MobileValues', sectionLayout.values, colors.mint);
  const content = createSectionContent();
  appendSectionHeading(
    content,
    'ONE VALUE MODEL.\nEVERYWHERE.',
    'Inspect the same immutable values used by construction, updates, tweens, and springs.',
    true,
  );
  const selected = fk.state.observable(0);
  const labels = ['Color3', 'UDim2', 'Vector2', 'UDim'] as const;
  for (const [index, label] of labels.entries()) {
    const control = button(
      label,
      fk.udim2FromOffset(172, 44),
      fk.udim2FromOffset((index % 2) * 186, 224 + Math.floor(index / 2) * 58),
      colors.ink,
      colors.text,
    );
    fk.update(control, { TextSize: 10, FontFamily: fonts.mono });
    bindButtonMotion(control, colors.ink, colors.violet);
    fk.on(control, 'MouseButton1Click', () => selected(index));
    fk.append(content, control);
  }
  const preview = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 302),
    Position: fk.udim2FromOffset(0, 362),
    BackgroundColor3: colors.paperRaised,
  });
  decorate(preview, 20, colors.ink, 2);
  const shape = fk.createFrame({
    Size: fk.udim2FromOffset(220, 150),
    Position: fk.udim2FromOffset(68, 72),
    BackgroundColor3: colors.coral,
  });
  decorate(shape, 18, colors.ink, 2);
  const shapeTitle = text({
    text: 'COLOR3',
    size: fk.udim2FromOffset(176, 42),
    position: fk.udim2FromOffset(22, 18),
    color: colors.ink,
    textSize: 23,
    weight: 900,
  });
  fk.append(shape, shapeTitle);
  fk.append(preview, shape);
  fk.append(content, preview);
  const code = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 230),
    Position: fk.udim2FromOffset(0, 694),
    BackgroundColor3: colors.ink,
  });
  decorate(code, 16, colors.inkSoft);
  const lines = [
    codeLine(code, '', 22, colors.violet),
    codeLine(code, '', 62),
    codeLine(code, '', 102, colors.coral),
    codeLine(code, '', 142),
    codeLine(code, '', 182, colors.mint),
  ];
  fk.append(content, code);
  const motion = fk.createMotion(shape, { tension: 210, friction: 21 });
  fk.state.observe(shape, selected, (value) => {
    const data = [
      [
        'COLOR3',
        colors.coral,
        fk.udim2FromOffset(68, 72),
        -2,
        [
          'const coral = fk.color3(',
          '  255, 111, 95',
          ');',
          'fk.update(card, {',
          '  BackgroundColor3: coral });',
        ],
      ],
      [
        'UDIM2',
        colors.violet,
        fk.udim2FromOffset(104, 48),
        3,
        [
          'const centered = fk.udim2(',
          '  0.5, -110,',
          '  0.5, -75',
          ');',
          'fk.update(card, { Position: centered });',
        ],
      ],
      [
        'VECTOR2',
        colors.amber,
        fk.udim2FromOffset(36, 104),
        -5,
        [
          'const anchor = fk.vector2(',
          '  0.5, 0.5',
          ');',
          'fk.update(card, {',
          '  AnchorPoint: anchor });',
        ],
      ],
      [
        'UDIM',
        colors.mint,
        fk.udim2FromOffset(86, 92),
        5,
        ['const gap = fk.udim(0, 16);', '', 'fk.createUIListLayout({', '  Padding: gap,', '});'],
      ],
    ] as const;
    const item = data[value]!;
    fk.update(shapeTitle, { Text: item[0] });
    motion.spring({ BackgroundColor3: item[1], Position: item[2], Rotation: item[3] });
    for (const [index, line] of lines.entries()) fk.update(line, { Text: item[4][index]! });
  });
  fk.append(section, content);
  return section;
}
