import { fk } from 'framekit';

import { bindButtonMotion } from '../../shared/interaction';
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

const valueExamples = [
  {
    label: 'Color3',
    title: 'COLOR3',
    accent: colors.coral,
    position: fk.udim2FromOffset(68, 72),
    rotation: -2,
    lines: [
      'const coral = fk.color3(',
      '  255, 111, 95',
      ');',
      'fk.update(card, {',
      '  BackgroundColor3: coral });',
    ],
  },
  {
    label: 'UDim2',
    title: 'UDIM2',
    accent: colors.violet,
    position: fk.udim2FromOffset(104, 48),
    rotation: 3,
    lines: [
      'const centered = fk.udim2(',
      '  0.5, -110,',
      '  0.5, -75',
      ');',
      'fk.update(card, { Position: centered });',
    ],
  },
  {
    label: 'Vector2',
    title: 'VECTOR2',
    accent: colors.amber,
    position: fk.udim2FromOffset(36, 104),
    rotation: -5,
    lines: [
      'const anchor = fk.vector2(',
      '  0.5, 0.5',
      ');',
      'fk.update(card, {',
      '  AnchorPoint: anchor });',
    ],
  },
  {
    label: 'UDim',
    title: 'UDIM',
    accent: colors.mint,
    position: fk.udim2FromOffset(86, 92),
    rotation: 5,
    lines: ['const gap = fk.udim(0, 16);', '', 'fk.createUIListLayout({', '  Padding: gap,', '});'],
  },
] as const;

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
  for (const [index, example] of valueExamples.entries()) {
    const control = createButton(
      example.label,
      fk.udim2FromOffset(172, 44),
      fk.udim2FromOffset((index % 2) * 186, 224 + Math.floor(index / 2) * 58),
      colors.ink,
      colors.text,
    );
    fk.update(control, { TextSize: 10, FontFamily: fonts.mono });
    bindButtonMotion(control, colors.ink, colors.violet);
    control.onClick(() => selected.set(index));
    fk.append(content, control);
  }
  const preview = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 302),
    Position: fk.udim2FromOffset(0, 362),
    BackgroundColor3: colors.paperRaised,
  });
  addRoundedBorder(preview, 20, colors.ink, 2);
  const shape = fk.createFrame({
    Size: fk.udim2FromOffset(220, 150),
    Position: fk.udim2FromOffset(68, 72),
    BackgroundColor3: colors.coral,
  });
  addRoundedBorder(shape, 18, colors.ink, 2);
  const shapeTitle = createText({
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
  addRoundedBorder(code, 16, colors.inkSoft);
  const lines = [
    appendCodeLine(code, '', 22, colors.violet),
    appendCodeLine(code, '', 62),
    appendCodeLine(code, '', 102, colors.coral),
    appendCodeLine(code, '', 142),
    appendCodeLine(code, '', 182, colors.mint),
  ];
  fk.append(content, code);
  fk.state.observe(shape, selected, (value) => {
    const example = valueExamples[value];
    if (!example) return;
    fk.update(shapeTitle, { Text: example.title });
    fk.spring(shape, {
      BackgroundColor3: example.accent,
      Position: example.position,
      Rotation: example.rotation,
    });
    updateTextLines(lines, example.lines);
  });
  fk.append(section, content);
  return section;
}
