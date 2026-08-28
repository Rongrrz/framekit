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
import { contentWidth, pageSection, scaledPosition, scaledSize, sectionContent } from '../geometry';
import { sectionLayout } from '../layout';

type ValueMode = 'Color3' | 'UDim2' | 'Vector2' | 'UDim';

const { top, height } = sectionLayout.values;

const valueModes: readonly ValueMode[] = ['Color3', 'UDim2', 'Vector2', 'UDim'];

const examples = {
  Color3: {
    title: 'COLOR3',
    description: 'A structural RGB value shared by properties, updates, tweens, and springs.',
    accent: colors.coral,
    position: fk.udim2FromOffset(180, 116),
    size: fk.udim2FromOffset(310, 210),
    rotation: -2,
    rows: ['R  255', 'G  111', 'B   95'],
    lines: [
      'const coral = fk.color3FromRGB(',
      '  255, 111, 95,',
      ');',
      'card.setProperties({',
      '  BackgroundColor3: coral,',
      '});',
    ],
  },
  UDim2: {
    title: 'UDIM2',
    description: 'Scale and offset describe size and position without hiding the underlying math.',
    accent: colors.violet,
    position: fk.udim2FromOffset(250, 72),
    size: fk.udim2FromOffset(360, 250),
    rotation: 2,
    rows: ['X  0.50, -180', 'Y  0.50, -125', 'SIZE  360 × 250'],
    lines: [
      'const centered = fk.udim2(',
      '  0.5, -180,',
      '  0.5, -125,',
      ');',
      'card.setProperties({',
      '  Position: centered });',
    ],
  },
  Vector2: {
    title: 'VECTOR2',
    description: 'Pairs such as anchor points remain immutable, serializable, and easy to inspect.',
    accent: colors.amber,
    position: fk.udim2FromOffset(92, 148),
    size: fk.udim2FromOffset(290, 190),
    rotation: -5,
    rows: ['X  0.50', 'Y  0.50', 'ANCHOR  CENTER'],
    lines: [
      'const center = fk.vector2(',
      '  0.5, 0.5,',
      ');',
      'card.setProperties({',
      '  AnchorPoint: center,',
      '});',
    ],
  },
  UDim: {
    title: 'UDIM',
    description:
      'One-dimensional scale and offset powers padding, gaps, and modifier measurements.',
    accent: colors.mint,
    position: fk.udim2FromOffset(214, 142),
    size: fk.udim2FromOffset(330, 198),
    rotation: 4,
    rows: ['SCALE  0', 'OFFSET  16', 'USED BY  PADDING'],
    lines: [
      'const gap = fk.udim(0, 16);',
      '',
      'fk.createUIListLayout({',
      '  Padding: gap,',
      '});',
      '',
    ],
  },
} as const;

export function createValues(): fk.FrameNode {
  const section = pageSection('Values', top, height, colors.mint);

  const content = sectionContent();

  const selected = fk.createValue<ValueMode>('Color3');

  content.addChild(
    createText({
      text: 'VALUES YOU CAN SEE,\nINSPECT, AND ANIMATE.',
      size: scaledSize(660, 126, contentWidth, height),
      position: scaledPosition(0, 62, contentWidth, height),
      color: colors.ink,
      textSize: 40,
      weight: 900,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  content.addChild(
    createText({
      text: 'FrameKit values are frozen structural objects—not opaque class instances. Select one to inspect it in motion.',
      size: scaledSize(390, 90, contentWidth, height),
      position: scaledPosition(730, 76, contentWidth, height),
      color: colors.inkSoft,
      textSize: 16,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  const lab = fk.createFrame({
    Name: 'ValueInspector',
    Size: scaledSize(contentWidth, 540, contentWidth, height),
    Position: scaledPosition(0, 222, contentWidth, height),
    BackgroundColor3: colors.paperRaised,
    ClipsDescendants: true,
  });
  addRoundedBorder(lab, 26, colors.ink, 2);

  const sidebar = fk.createFrame({
    Name: 'ValuePicker',
    Size: fk.udim2FromOffset(300, 540),
    BackgroundColor3: colors.ink,
  });

  sidebar.addChild(
    createText({
      text: 'VALUE CONSTRUCTORS',
      size: fk.udim2FromOffset(244, 30),
      position: fk.udim2FromOffset(28, 28),
      color: colors.textMuted,
      textSize: 10,
      font: fonts.mono,
      weight: 750,
    }),
  );

  const controls = new Map<ValueMode, fk.TextButtonNode>();
  for (const [index, key] of valueModes.entries()) {
    const control = createButton(
      key,
      fk.udim2FromOffset(244, 62),
      fk.udim2FromOffset(28, 78 + index * 74),
      colors.inkRaised,
      colors.text,
    );
    control.setProperties({ TextSize: 13, FontFamily: fonts.mono, TextXAlignment: 'Left' });
    const inset = createText({
      text: `0${index + 1}`,
      size: fk.udim2FromOffset(36, 24),
      position: fk.udim2FromOffset(194, 19),
      color: colors.textMuted,
      textSize: 9,
      font: fonts.mono,
      xAlignment: 'Center',
    });
    control.addChild(inset);
    bindScaleMotion(control, 1.025);
    control.onClick(() => selected.set(key));
    controls.set(key, control);
    sidebar.addChild(control);
  }
  sidebar.addChild(
    createText({
      text: 'One vocabulary from construction to animation.',
      size: fk.udim2FromOffset(244, 66),
      position: fk.udim2FromOffset(28, 400),
      color: colors.textMuted,
      textSize: 12,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  lab.addChild(sidebar);

  const stage = fk.createFrame({
    Name: 'ValueStage',
    Size: fk.udim2(1, -300, 1, 0),
    Position: fk.udim2FromOffset(300, 0),
    BackgroundColor3: colors.paperRaised,
    ClipsDescendants: true,
  });

  const previewArea = fk.createFrame({
    Size: fk.udim2FromOffset(500, 430),
    Position: fk.udim2FromOffset(32, 54),
    BackgroundColor3: colors.paper,
  });
  addRoundedBorder(previewArea, 20, colors.paperMuted);

  const preview = fk.createFrame({
    Name: 'AnimatedValuePreview',
    Size: examples.Color3.size,
    Position: examples.Color3.position,
    BackgroundColor3: colors.coral,
  });
  addRoundedBorder(preview, 24, colors.ink, 2);

  const previewTitle = createText({
    text: 'COLOR3',
    size: fk.udim2(1, -48, 0, 54),
    position: fk.udim2FromOffset(24, 22),
    color: colors.ink,
    textSize: 28,
    weight: 900,
  });

  preview.addChild(previewTitle);

  previewArea.addChild(preview);

  stage.addChild(previewArea);

  const inspector = fk.createFrame({
    Name: 'ValueData',
    Size: fk.udim2FromOffset(234, 196),
    Position: fk.udim2FromOffset(558, 54),
    BackgroundColor3: colors.ink,
  });
  addRoundedBorder(inspector, 16, colors.inkSoft);

  const dataTitle = appendCodeLine(inspector, 'READONLY VALUE', 18, colors.textMuted);

  const dataRows = [
    appendCodeLine(inspector, '', 62, colors.coral),
    appendCodeLine(inspector, '', 96, colors.text),
    appendCodeLine(inspector, '', 130, colors.text),
  ];
  dataTitle.setProperties({ TextSize: 9 });

  stage.addChild(inspector);

  const code = fk.createFrame({
    Name: 'ValueCode',
    Size: fk.udim2FromOffset(234, 206),
    Position: fk.udim2FromOffset(558, 278),
    BackgroundColor3: colors.ink,
  });
  addRoundedBorder(code, 16, colors.inkSoft);

  const codeRows = [
    appendCodeLine(code, '', 14, colors.violet),
    appendCodeLine(code, '', 44),
    appendCodeLine(code, '', 74, colors.coral),
    appendCodeLine(code, '', 104),
    appendCodeLine(code, '', 134, colors.mint),
    appendCodeLine(code, '', 164),
  ];
  for (const row of codeRows) row.setProperties({ TextSize: 10 });

  stage.addChild(code);

  lab.addChild(stage);
  preview.watch(selected, (value) => {
    const example = examples[value];
    fk.spring(preview, {
      Position: example.position,
      Size: example.size,
      Rotation: example.rotation,
      BackgroundColor3: example.accent,
    });
    previewTitle.setProperties({ Text: example.title });
    for (const [index, row] of dataRows.entries()) {
      row.setProperties({
        Text: example.rows[index] ?? '',
        TextColor3: index === 0 ? example.accent : colors.text,
      });
    }
    updateTextLines(codeRows, example.lines);
    for (const [key, control] of controls) {
      control.setProperties({
        BackgroundColor3: key === value ? example.accent : colors.inkRaised,
        TextColor3: key === value ? colors.ink : colors.text,
      });
    }
  });

  content.addChild(lab);

  section.addChild(content);
  return section;
}
