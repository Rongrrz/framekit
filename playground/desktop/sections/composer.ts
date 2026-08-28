import { fk } from 'framekit';

import { bindButtonMotion, bindScaleMotion } from '../../shared/interaction';
import { createSpringModifierToggle, setModifierAttached } from '../../shared/modifier';
import {
  createButton,
  appendCodeLine,
  addRoundedBorder,
  createPill,
  createText,
} from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { contentWidth, pageSection, scaledPosition, scaledSize, sectionContent } from '../geometry';
import { sectionLayout } from '../layout';

type ModifierKey =
  | 'corner'
  | 'stroke'
  | 'shadow'
  | 'glow'
  | 'padding'
  | 'layout'
  | 'scale'
  | 'rotation';

type ComposerState = Readonly<Record<ModifierKey, boolean>>;

const { top, height } = sectionLayout.composer;

const modifierKeys: readonly ModifierKey[] = [
  'corner',
  'stroke',
  'shadow',
  'glow',
  'padding',
  'layout',
  'scale',
  'rotation',
];

const initialState: ComposerState = {
  corner: true,
  stroke: true,
  shadow: true,
  glow: true,
  padding: false,
  layout: true,
  scale: false,
  rotation: false,
};

export function createComposer(): fk.FrameNode {
  const section = pageSection('Composer', top, height, colors.paper);

  const content = sectionContent();

  const configuration = fk.createValue<ComposerState>(initialState);

  content.addChild(
    createPill(
      'MODIFIER COMPOSER  ·  FULLY INTERACTIVE',
      scaledSize(316, 38, contentWidth, height),
      scaledPosition(0, 62, contentWidth, height),
      colors.coral,
    ),
  );

  content.addChild(
    createText({
      text: 'Build appearance by\ncomposing the tree.',
      size: scaledSize(640, 130, contentWidth, height),
      position: scaledPosition(0, 116, contentWidth, height),
      color: colors.darkText,
      textSize: 40,
      weight: 900,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  content.addChild(
    createText({
      text: 'Toggle real modifier nodes. The preview, node tree, and generated snippet all update together.',
      size: scaledSize(380, 94, contentWidth, height),
      position: scaledPosition(740, 130, contentWidth, height),
      color: colors.darkMuted,
      textSize: 16,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  const lab = fk.createFrame({
    Name: 'ModifierComposerLab',
    Size: scaledSize(contentWidth, 590, contentWidth, height),
    Position: scaledPosition(0, 272, contentWidth, height),
    BackgroundColor3: colors.ink,
    ClipsDescendants: true,
  });
  addRoundedBorder(lab, 26, colors.darkText, 2);

  const controls = fk.createFrame({
    Name: 'ModifierControls',
    Size: fk.udim2FromOffset(360, 590),
    BackgroundColor3: colors.inkRaised,
  });

  controls.addChild(
    createText({
      text: 'CLICK TO ADD / REMOVE',
      size: fk.udim2FromOffset(300, 30),
      position: fk.udim2FromOffset(28, 26),
      color: colors.textMuted,
      textSize: 10,
      font: fonts.mono,
      weight: 700,
    }),
  );

  const accents: Record<ModifierKey, fk.Color3> = {
    corner: colors.coral,
    stroke: colors.violet,
    shadow: colors.amber,
    glow: colors.mint,
    padding: colors.mint,
    layout: colors.amber,
    scale: colors.coral,
    rotation: colors.violet,
  };

  const toggles = new Map<ModifierKey, fk.TextButtonNode>();
  for (const [index, key] of modifierKeys.entries()) {
    const control = createButton(
      key.toUpperCase(),
      fk.udim2FromOffset(144, 46),
      fk.udim2FromOffset(28 + (index % 2) * 160, 78 + Math.floor(index / 2) * 62),
      colors.ink,
      colors.textMuted,
    );
    control.setProperties({ TextSize: 11, FontFamily: fonts.mono });
    bindScaleMotion(control, 1.04);
    control.onClick(() => {
      configuration.update((current) => ({ ...current, [key]: !current[key] }));
    });
    toggles.set(key, control);
    controls.addChild(control);
  }

  const randomize = createButton(
    'RANDOMIZE BUILD  ✦',
    fk.udim2FromOffset(304, 46),
    fk.udim2FromOffset(28, 330),
    colors.coral,
    colors.ink,
  );
  bindButtonMotion(randomize, colors.coral, colors.amber);
  let randomStep = 0;

  const presets: readonly ComposerState[] = [
    {
      corner: false,
      stroke: true,
      shadow: false,
      glow: true,
      padding: true,
      layout: false,
      scale: true,
      rotation: true,
    },
    {
      corner: true,
      stroke: false,
      shadow: true,
      glow: false,
      padding: false,
      layout: true,
      scale: true,
      rotation: false,
    },
    {
      corner: true,
      stroke: true,
      shadow: true,
      glow: true,
      padding: true,
      layout: true,
      scale: false,
      rotation: true,
    },
  ];
  randomize.onClick(() => {
    const preset = presets[randomStep % presets.length];
    if (preset) configuration.set(preset);
    randomStep += 1;
  });

  controls.addChild(randomize);

  const reset = createButton(
    'RESET DEFAULTS',
    fk.udim2FromOffset(304, 40),
    fk.udim2FromOffset(28, 388),
    colors.ink,
    colors.textMuted,
  );
  reset.setProperties({ TextSize: 10, FontFamily: fonts.mono });
  bindButtonMotion(reset, colors.ink, colors.inkSoft);
  reset.onClick(() => configuration.set(initialState));

  controls.addChild(reset);

  const tree = fk.createFrame({
    Name: 'LiveNodeTree',
    Size: fk.udim2FromOffset(304, 128),
    Position: fk.udim2FromOffset(28, 444),
    BackgroundColor3: colors.ink,
  });
  addRoundedBorder(tree, 14, colors.inkSoft);

  const treeTitle = appendCodeLine(tree, '▼ NotificationCard', 14, colors.coral);

  const modifierLine = appendCodeLine(tree, '', 44, colors.textMuted);

  const layoutLine = appendCodeLine(tree, '', 74, colors.textMuted);

  const transformLine = appendCodeLine(tree, '', 100, colors.textMuted);
  treeTitle.setProperties({ TextSize: 11 });
  for (const line of [modifierLine, layoutLine, transformLine])
    line.setProperties({ TextSize: 10 });

  controls.addChild(tree);

  lab.addChild(controls);

  const stage = fk.createFrame({
    Name: 'ModifierStage',
    Size: fk.udim2(1, -360, 1, 0),
    Position: fk.udim2FromOffset(360, 0),
    BackgroundColor3: colors.paperRaised,
    ClipsDescendants: true,
  });

  stage.addChild(
    createText({
      text: 'LIVE PREVIEW',
      size: fk.udim2FromOffset(180, 28),
      position: fk.udim2FromOffset(36, 28),
      color: colors.darkMuted,
      textSize: 10,
      font: fonts.mono,
      weight: 750,
    }),
  );

  stage.addChild(
    createText({
      text: 'SHADOW ↓ DIRECTIONAL DEPTH   ·   GLOW ✦ SILHOUETTE LIGHT',
      size: fk.udim2FromOffset(430, 28),
      position: fk.udim2FromOffset(294, 28),
      color: colors.darkMuted,
      textSize: 9,
      font: fonts.mono,
      weight: 750,
      xAlignment: 'Right',
    }),
  );

  const sample = fk.createFrame({
    Name: 'NotificationCard',
    Size: fk.udim2FromOffset(420, 320),
    Position: fk.udim2FromOffset(170, 68),
    BackgroundColor3: colors.ink,
  });

  const corner = fk.createUICorner({ CornerRadius: 28 });

  const stroke = fk.createUIStroke({
    Color: colors.violet,
    Thickness: 4,
    BorderStrokePosition: 'Outer',
  });

  const shadow = fk.createUIShadow({
    Color: colors.ink,
    Transparency: 0.32,
    Offset: fk.vector2(12, 18),
    BlurRadius: 18,
    SpreadRadius: -2,
  });

  const glow = fk.createUIGlow({
    Color: colors.violet,
    Transparency: 0.18,
    Radius: 36,
  });

  const padding = fk.createUIPadding({
    PaddingTop: fk.udim(0, 16),
    PaddingRight: fk.udim(0, 16),
    PaddingBottom: fk.udim(0, 16),
    PaddingLeft: fk.udim(0, 16),
  });

  const sampleScale = fk.createUIScale();

  sample.addChild(corner);

  sample.addChild(stroke);

  sample.addChild(shadow);

  sample.addChild(sampleScale);

  const badge = fk.createTextLabel({
    Size: fk.udim2FromOffset(54, 54),
    Position: fk.udim2FromOffset(26, 26),
    BackgroundColor3: colors.coral,
    Text: '✓',
    TextColor3: colors.ink,
    TextSize: 24,
    FontFamily: fonts.sans,
    FontWeight: 900,
  });

  badge.addChild(fk.createUICorner({ CornerRadius: 16 }));

  sample.addChild(badge);

  sample.addChild(
    createText({
      text: 'LOADOUT SAVED',
      size: fk.udim2FromOffset(282, 46),
      position: fk.udim2FromOffset(98, 22),
      textSize: 23,
      weight: 900,
    }),
  );

  const description = fk.createTextBox({
    Name: 'EditableRichDescription',
    Size: fk.udim2FromOffset(336, 60),
    Position: fk.udim2FromOffset(28, 94),
    BackgroundTransparency: 1,
    Text: 'Every <b>piece</b> is editable. Try changing this <font color="#ae91ff">rich text</font>.',
    TextColor3: colors.textMuted,
    TextSize: 14,
    TextWrapped: true,
    TextXAlignment: 'Left',
    TextYAlignment: 'Top',
    FontFamily: fonts.sans,
    FontWeight: 500,
    RichText: true,
    MultiLine: true,
    PlaceholderText: 'Type a card description…',
  });

  sample.addChild(description);

  const tags = fk.createFrame({
    Name: 'FeatureTags',
    Size: fk.udim2FromOffset(360, 74),
    Position: fk.udim2FromOffset(28, 170),
    BackgroundColor3: colors.inkSoft,
  });

  tags.addChild(fk.createUICorner({ CornerRadius: 14 }));

  const tagLayout = fk.createUIListLayout({ FillDirection: 'Horizontal', Padding: fk.udim(0, 8) });

  const tagsContent = [
    { label: 'TYPED', accent: colors.mint },
    { label: 'OWNED', accent: colors.violet },
    { label: 'ANIMATED', accent: colors.amber },
  ] as const;
  for (const [index, tagContent] of tagsContent.entries()) {
    const tag = fk.createTextLabel({
      Size: fk.udim2FromOffset(104, 34),
      Position: fk.udim2FromOffset(12 + index * 30, 10 + index * 8),
      BackgroundColor3: colors.ink,
      Text: tagContent.label,
      TextColor3: tagContent.accent,
      TextSize: 9,
      FontFamily: fonts.mono,
      FontWeight: 750,
      LayoutOrder: index,
    });
    tag.addChild(fk.createUICorner({ CornerRadius: 10 }));
    tags.addChild(tag);
  }
  tags.addChild(tagLayout);

  sample.addChild(tags);

  sample.addChild(
    createText({
      text: 'card.addChild(modifier)  →',
      size: fk.udim2FromOffset(332, 36),
      position: fk.udim2FromOffset(28, 266),
      color: colors.violet,
      textSize: 11,
      font: fonts.mono,
    }),
  );

  stage.addChild(sample);

  const snippet = fk.createFrame({
    Name: 'GeneratedSnippet',
    Size: fk.udim2FromOffset(660, 142),
    Position: fk.udim2FromOffset(58, 416),
    BackgroundColor3: colors.paper,
  });
  addRoundedBorder(snippet, 16, colors.paperMuted);
  appendCodeLine(snippet, '// Modifiers share the spring API', 16, colors.darkMuted);

  const snippetOne = appendCodeLine(snippet, '', 48, colors.coral);

  const snippetTwo = appendCodeLine(snippet, '', 80, colors.violet);
  snippetOne.setProperties({ TextColor3: colors.darkText });
  snippetTwo.setProperties({ TextColor3: colors.darkText });

  stage.addChild(snippet);

  lab.addChild(stage);

  const strokeMotion = fk.createMotion(stroke);

  const shadowMotion = fk.createMotion(shadow);

  const glowMotion = fk.createMotion(glow);

  const paddingMotion = fk.createMotion(padding);

  const toggleStroke = createSpringModifierToggle({
    parent: sample,
    modifier: stroke,
    motion: strokeMotion,
    active: { Thickness: 4 },
    inactive: { Thickness: 0 },
    isActive: () => configuration.get().stroke,
  });

  const toggleShadow = createSpringModifierToggle({
    parent: sample,
    modifier: shadow,
    motion: shadowMotion,
    active: {
      Transparency: 0.32,
      Offset: fk.vector2(12, 18),
      BlurRadius: 18,
      SpreadRadius: -2,
    },
    inactive: {
      Transparency: 1,
      Offset: fk.vector2(0, 0),
      BlurRadius: 0,
      SpreadRadius: -2,
    },
    isActive: () => configuration.get().shadow,
  });

  const toggleGlow = createSpringModifierToggle({
    parent: sample,
    modifier: glow,
    motion: glowMotion,
    active: { Transparency: 0.18, Radius: 36 },
    inactive: { Transparency: 1, Radius: 0 },
    isActive: () => configuration.get().glow,
  });

  const zeroPadding = {
    PaddingTop: fk.udim(0, 0),
    PaddingRight: fk.udim(0, 0),
    PaddingBottom: fk.udim(0, 0),
    PaddingLeft: fk.udim(0, 0),
  } as const;

  const togglePadding = createSpringModifierToggle({
    parent: tags,
    modifier: padding,
    motion: paddingMotion,
    active: {
      PaddingTop: fk.udim(0, 16),
      PaddingRight: fk.udim(0, 16),
      PaddingBottom: fk.udim(0, 16),
      PaddingLeft: fk.udim(0, 16),
    },
    inactive: zeroPadding,
    isActive: () => configuration.get().padding,
  });
  sample.onMouseEnter(() => {
    const current = configuration.get();
    if (current.shadow) shadowMotion.spring({ Offset: fk.vector2(16, 24), BlurRadius: 24 });
    if (current.glow) glowMotion.spring({ Radius: 46, Transparency: 0.12 });
  });
  sample.onMouseLeave(() => {
    const current = configuration.get();
    if (current.shadow) shadowMotion.spring({ Offset: fk.vector2(12, 18), BlurRadius: 18 });
    if (current.glow) glowMotion.spring({ Radius: 36, Transparency: 0.18 });
  });
  sample.watch(configuration, (value) => {
    setModifierAttached(sample, corner, value.corner);
    toggleStroke(value.stroke);
    toggleShadow(value.shadow);
    toggleGlow(value.glow);
    togglePadding(value.padding);
    setModifierAttached(tags, tagLayout, value.layout);
    fk.spring(sampleScale, { Scale: value.scale ? 1.07 : 1 });
    fk.spring(sample, { Rotation: value.rotation ? -4 : 0 });
    for (const [key, control] of toggles) {
      const active = value[key];
      control.setProperties({
        Text: `${active ? '●' : '○'}  ${key.toUpperCase()}`,
        BackgroundColor3: active ? accents[key] : colors.ink,
        TextColor3: active ? colors.ink : colors.textMuted,
      });
    }
    const styles = [
      value.corner && 'UICorner',
      value.stroke && 'UIStroke',
      value.shadow && 'UIShadow',
      value.glow && 'UIGlow',
      value.padding && 'UIPadding',
    ]
      .filter(Boolean)
      .join('  +  ');
    modifierLine.setProperties({ Text: `  ${styles || 'no style modifiers'}` });
    layoutLine.setProperties({
      Text: `  ${value.layout ? 'UIListLayout attached' : 'manual positions restored'}`,
    });
    transformLine.setProperties({
      Text: `  Scale ${value.scale ? '1.07' : '1.00'}  /  Rotation ${value.rotation ? '-4°' : '0°'}`,
    });
    snippetOne.setProperties({
      Text: `fk.spring(stroke, { Thickness: ${value.stroke ? '4' : '0'} });`,
    });
    snippetTwo.setProperties({
      Text: value.layout ? 'tags.addChild(listLayout);' : 'listLayout.removeFromParent();',
    });
  });

  content.addChild(lab);

  section.addChild(content);
  return section;
}
