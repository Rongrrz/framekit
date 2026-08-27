import { fk } from 'framekit';

import { bindButtonMotion, bindScaleMotion } from '../../shared/interaction';
import { createSpringModifierToggle, setModifierAttached } from '../../shared/modifier';
import { button, codeLine, decorate, pill, text } from '../../shared/ui';
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
  const configuration = fk.state.observable<ComposerState>(initialState);

  fk.append(
    content,
    pill(
      'MODIFIER COMPOSER  ·  FULLY INTERACTIVE',
      scaledSize(316, 38, contentWidth, height),
      scaledPosition(0, 62, contentWidth, height),
      colors.coral,
    ),
  );
  fk.append(
    content,
    text({
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
  fk.append(
    content,
    text({
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
  decorate(lab, 26, colors.darkText, 2);

  const controls = fk.createFrame({
    Name: 'ModifierControls',
    Size: fk.udim2FromOffset(360, 590),
    BackgroundColor3: colors.inkRaised,
  });
  fk.append(
    controls,
    text({
      text: 'CLICK TO ATTACH / DETACH',
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
  const keys = Object.keys(initialState) as ModifierKey[];
  for (const [index, key] of keys.entries()) {
    const control = button(
      key.toUpperCase(),
      fk.udim2FromOffset(144, 46),
      fk.udim2FromOffset(28 + (index % 2) * 160, 78 + Math.floor(index / 2) * 62),
      colors.ink,
      colors.textMuted,
    );
    fk.update(control, { TextSize: 11, FontFamily: fonts.mono });
    bindScaleMotion(control, 1.04);
    fk.on(control, 'MouseButton1Click', () => {
      const current = configuration();
      configuration({ ...current, [key]: !current[key] });
    });
    toggles.set(key, control);
    fk.append(controls, control);
  }

  const randomize = button(
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
  fk.on(randomize, 'MouseButton1Click', () => {
    configuration(presets[randomStep % presets.length]!);
    randomStep += 1;
  });
  fk.append(controls, randomize);

  const reset = button(
    'RESET DEFAULTS',
    fk.udim2FromOffset(304, 40),
    fk.udim2FromOffset(28, 388),
    colors.ink,
    colors.textMuted,
  );
  fk.update(reset, { TextSize: 10, FontFamily: fonts.mono });
  bindButtonMotion(reset, colors.ink, colors.inkSoft);
  fk.on(reset, 'MouseButton1Click', () => configuration(initialState));
  fk.append(controls, reset);

  const tree = fk.createFrame({
    Name: 'LiveNodeTree',
    Size: fk.udim2FromOffset(304, 128),
    Position: fk.udim2FromOffset(28, 444),
    BackgroundColor3: colors.ink,
  });
  decorate(tree, 14, colors.inkSoft);
  const treeTitle = codeLine(tree, '▼ NotificationCard', 14, colors.coral);
  const modifierLine = codeLine(tree, '', 44, colors.textMuted);
  const layoutLine = codeLine(tree, '', 74, colors.textMuted);
  const transformLine = codeLine(tree, '', 100, colors.textMuted);
  fk.update(treeTitle, { TextSize: 11 });
  for (const line of [modifierLine, layoutLine, transformLine]) fk.update(line, { TextSize: 10 });
  fk.append(controls, tree);
  fk.append(lab, controls);

  const stage = fk.createFrame({
    Name: 'ModifierStage',
    Size: fk.udim2(1, -360, 1, 0),
    Position: fk.udim2FromOffset(360, 0),
    BackgroundColor3: colors.paperRaised,
    ClipsDescendants: true,
  });
  fk.append(
    stage,
    text({
      text: 'LIVE PREVIEW',
      size: fk.udim2FromOffset(180, 28),
      position: fk.udim2FromOffset(36, 28),
      color: colors.darkMuted,
      textSize: 10,
      font: fonts.mono,
      weight: 750,
    }),
  );
  fk.append(
    stage,
    text({
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
    Thickness: 3,
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
  fk.append(sample, corner);
  fk.append(sample, stroke);
  fk.append(sample, shadow);
  fk.append(sample, sampleScale);

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
  fk.append(badge, fk.createUICorner({ CornerRadius: 16 }));
  fk.append(sample, badge);
  fk.append(
    sample,
    text({
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
  fk.append(sample, description);

  const tags = fk.createFrame({
    Name: 'FeatureTags',
    Size: fk.udim2FromOffset(360, 74),
    Position: fk.udim2FromOffset(28, 170),
    BackgroundColor3: colors.inkSoft,
  });
  fk.append(tags, fk.createUICorner({ CornerRadius: 14 }));
  const tagLayout = fk.createUIListLayout({ FillDirection: 'Horizontal', Padding: fk.udim(0, 8) });
  for (const [index, label] of ['TYPED', 'OWNED', 'ANIMATED'].entries()) {
    const tag = fk.createTextLabel({
      Size: fk.udim2FromOffset(104, 34),
      Position: fk.udim2FromOffset(12 + index * 30, 10 + index * 8),
      BackgroundColor3: colors.ink,
      Text: label,
      TextColor3: [colors.mint, colors.violet, colors.amber][index]!,
      TextSize: 9,
      FontFamily: fonts.mono,
      FontWeight: 750,
      LayoutOrder: index,
    });
    fk.append(tag, fk.createUICorner({ CornerRadius: 10 }));
    fk.append(tags, tag);
  }
  fk.append(tags, tagLayout);
  fk.append(sample, tags);
  fk.append(
    sample,
    text({
      text: 'append(card, modifier)  →',
      size: fk.udim2FromOffset(332, 36),
      position: fk.udim2FromOffset(28, 266),
      color: colors.violet,
      textSize: 11,
      font: fonts.mono,
    }),
  );
  fk.append(stage, sample);

  const snippet = fk.createFrame({
    Name: 'GeneratedSnippet',
    Size: fk.udim2FromOffset(660, 142),
    Position: fk.udim2FromOffset(58, 416),
    BackgroundColor3: colors.paper,
  });
  decorate(snippet, 16, colors.paperMuted);
  codeLine(snippet, '// The tree is the styling API', 16, colors.darkMuted);
  const snippetOne = codeLine(snippet, '', 48, colors.coral);
  const snippetTwo = codeLine(snippet, '', 80, colors.violet);
  fk.update(snippetOne, { TextColor3: colors.darkText });
  fk.update(snippetTwo, { TextColor3: colors.darkText });
  fk.append(stage, snippet);
  fk.append(lab, stage);

  const sampleMotion = fk.createMotion(sample, { tension: 210, friction: 20 });
  const scaleMotion = fk.createMotion(sampleScale, { tension: 230, friction: 20 });
  const shadowMotion = fk.createMotion(shadow, { tension: 220, friction: 32 });
  const glowMotion = fk.createMotion(glow, { tension: 220, friction: 32 });
  const paddingMotion = fk.createMotion(padding, { tension: 240, friction: 34 });
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
    isActive: () => configuration().shadow,
  });
  const toggleGlow = createSpringModifierToggle({
    parent: sample,
    modifier: glow,
    motion: glowMotion,
    active: { Transparency: 0.18, Radius: 36 },
    inactive: { Transparency: 1, Radius: 0 },
    isActive: () => configuration().glow,
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
    isActive: () => configuration().padding,
  });
  fk.on(sample, 'MouseEnter', () => {
    const current = configuration();
    if (current.shadow) shadowMotion.spring({ Offset: fk.vector2(16, 24), BlurRadius: 24 });
    if (current.glow) glowMotion.spring({ Radius: 46, Transparency: 0.12 });
  });
  fk.on(sample, 'MouseLeave', () => {
    const current = configuration();
    if (current.shadow) shadowMotion.spring({ Offset: fk.vector2(12, 18), BlurRadius: 18 });
    if (current.glow) glowMotion.spring({ Radius: 36, Transparency: 0.18 });
  });
  fk.state.observe(sample, configuration, (value) => {
    setModifierAttached(sample, corner, value.corner);
    setModifierAttached(sample, stroke, value.stroke);
    toggleShadow(value.shadow);
    toggleGlow(value.glow);
    togglePadding(value.padding);
    setModifierAttached(tags, tagLayout, value.layout);
    scaleMotion.spring({ Scale: value.scale ? 1.07 : 1 });
    sampleMotion.spring({ Rotation: value.rotation ? -4 : 0 });

    for (const [key, control] of toggles) {
      const active = value[key];
      fk.update(control, {
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
    fk.update(modifierLine, { Text: `  ${styles || 'no style modifiers'}` });
    fk.update(layoutLine, {
      Text: `  ${value.layout ? 'UIListLayout attached' : 'manual positions restored'}`,
    });
    fk.update(transformLine, {
      Text: `  Scale ${value.scale ? '1.07' : '1.00'}  /  Rotation ${value.rotation ? '-4°' : '0°'}`,
    });
    fk.update(snippetOne, {
      Text:
        value.corner || value.stroke || value.padding
          ? 'fk.append(card, activeModifier);'
          : '// style modifiers detached',
    });
    fk.update(snippetTwo, {
      Text: value.layout ? 'fk.append(tags, listLayout);' : 'fk.detach(listLayout);',
    });
  });

  fk.append(content, lab);
  fk.append(section, content);
  return section;
}
