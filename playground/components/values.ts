import { fk, fka } from 'framekit';

import { sectionLayout } from '../layout';
import {
  contentWidth,
  createSection,
  createSectionContent,
  appendSectionHeading,
} from '../section';
import { bindButtonMotion } from '../shared/interaction';
import {
  createButton,
  appendCodeLine,
  addRoundedBorder,
  createText,
  updateTextLines,
} from '../shared/ui';
import { colors, fonts } from '../theme';

const valueExamples = [
  {
    label: 'Color3',
    title: 'COLOR3',
    accent: colors.coral,
    position: fk.udim2FromOffset(68, 72),
    rotation: -2,
    lines: [
      'const coral = fk.color3FromRGB(',
      '  255, 111, 95',
      ');',
      'card.setProperties({',
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
      'card.setProperties({ Position: centered });',
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
      'card.setProperties({',
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
  const section = createSection('Values', sectionLayout.values, colors.mint);

  const content = createSectionContent();
  appendSectionHeading(
    content,
    'ONE VALUE MODEL.\nEVERYWHERE.',
    'Inspect the same immutable values used by construction, updates, tweens, and springs.',
    true,
  );

  const selected = fk.createValue(0);
  for (const [index, example] of valueExamples.entries()) {
    const control = createButton(
      example.label,
      fk.udim2FromOffset(172, 44),
      fk.udim2FromOffset((index % 2) * 186, 224 + Math.floor(index / 2) * 58),
      colors.ink,
      colors.text,
    );
    control.setProperties({ TextSize: 10, FontFamily: fonts.mono });
    bindButtonMotion(control, colors.ink, colors.violet);
    control.onClick(() => selected.set(index));
    content.addChild(control);
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

  shape.addChild(shapeTitle);

  preview.addChild(shape);

  content.addChild(preview);

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
  content.addChild(code);
  shape.watch(selected, (value) => {
    const example = valueExamples[value];
    if (!example) return;
    shapeTitle.setProperties({ Text: example.title });
    fka.spring(shape, {
      BackgroundColor3: example.accent,
      Position: example.position,
      Rotation: example.rotation,
    });
    updateTextLines(lines, example.lines);
  });

  section.addChild(content);
  return section;
}
