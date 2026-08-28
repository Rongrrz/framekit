import { fk } from 'framekit';

import { bindScaleMotion } from '../../shared/interaction';
import { createSpringModifierToggle, setModifierAttached } from '../../shared/modifier';
import { createButton, appendCodeLine, addRoundedBorder, createText } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { sectionLayout } from '../layout';
import {
  contentWidth,
  createSection,
  createSectionContent,
  appendSectionHeading,
} from '../primitives';

type ModifierKey = 'corner' | 'stroke' | 'shadow' | 'glow' | 'padding' | 'layout';
type ComposerState = Readonly<Record<ModifierKey, boolean>>;

const modifierKeys: readonly ModifierKey[] = [
  'corner',
  'stroke',
  'shadow',
  'glow',
  'padding',
  'layout',
];

export function createComposer(): fk.FrameNode {
  const section = createSection('MobileComposer', sectionLayout.composer, colors.paper);
  const content = createSectionContent();
  appendSectionHeading(
    content,
    'ATTACH IT.\nSEE THE DIFFERENCE.',
    'These controls change real modifier nodes on the preview below.',
    true,
  );
  const enabled = fk.state.observable<ComposerState>({
    corner: true,
    stroke: true,
    shadow: true,
    glow: true,
    padding: false,
    layout: true,
  });
  const controls = new Map<ModifierKey, fk.TextButtonNode>();
  for (const [index, key] of modifierKeys.entries()) {
    const control = createButton(
      key.toUpperCase(),
      fk.udim2FromOffset(172, 46),
      fk.udim2FromOffset((index % 2) * 186, 226 + Math.floor(index / 2) * 60),
      colors.ink,
      colors.text,
    );
    fk.update(control, { TextSize: 10, FontFamily: fonts.mono });
    bindScaleMotion(control, 1.035);
    control.onClick(() => {
      enabled.update((state) => ({ ...state, [key]: !state[key] }));
    });
    controls.set(key, control);
    fk.append(content, control);
  }
  const preview = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 480),
    Position: fk.udim2FromOffset(0, 428),
    BackgroundColor3: colors.paperRaised,
  });
  addRoundedBorder(preview, 22, colors.paperMuted, 2);
  fk.append(
    preview,
    createText({
      text: 'SHADOW ↓ DEPTH   ·   GLOW ✦ LIGHT',
      size: fk.udim2FromOffset(314, 28),
      position: fk.udim2FromOffset(22, 18),
      color: colors.darkMuted,
      textSize: 9,
      font: fonts.mono,
      weight: 750,
    }),
  );
  const card = fk.createFrame({
    Size: fk.udim2FromOffset(314, 336),
    Position: fk.udim2FromOffset(22, 76),
    BackgroundColor3: colors.ink,
  });
  const corner = fk.createUICorner({ CornerRadius: 24 });
  const stroke = fk.createUIStroke({
    Color: colors.violet,
    Thickness: 4,
    BorderStrokePosition: 'Outer',
  });
  const shadow = fk.createUIShadow({
    Color: colors.ink,
    Transparency: 0.3,
    Offset: fk.vector2(10, 16),
    BlurRadius: 16,
    SpreadRadius: -2,
  });
  const glow = fk.createUIGlow({
    Color: colors.violet,
    Transparency: 0.18,
    Radius: 32,
  });
  fk.append(card, corner);
  fk.append(card, stroke);
  fk.append(card, shadow);
  fk.append(
    card,
    createText({
      text: 'MODIFIER STACK',
      size: fk.udim2FromOffset(270, 42),
      position: fk.udim2FromOffset(22, 18),
      textSize: 21,
      weight: 900,
    }),
  );
  const description = fk.createTextBox({
    Name: 'MobileRichDescription',
    Size: fk.udim2FromOffset(270, 72),
    Position: fk.udim2FromOffset(22, 68),
    BackgroundTransparency: 1,
    Text: 'This is <b>editable rich text</b>. Padding and layout affect the tags below.',
    TextColor3: colors.textMuted,
    TextSize: 12,
    TextWrapped: true,
    TextXAlignment: 'Left',
    TextYAlignment: 'Top',
    FontFamily: fonts.sans,
    RichText: true,
    MultiLine: true,
    PlaceholderText: 'Type a description…',
  });
  fk.append(card, description);
  const tags = fk.createFrame({
    Size: fk.udim2FromOffset(270, 94),
    Position: fk.udim2FromOffset(22, 156),
    BackgroundColor3: colors.inkSoft,
  });
  fk.append(tags, fk.createUICorner({ CornerRadius: 14 }));
  const padding = fk.createUIPadding({
    PaddingTop: fk.udim(0, 12),
    PaddingRight: fk.udim(0, 12),
    PaddingBottom: fk.udim(0, 12),
    PaddingLeft: fk.udim(0, 12),
  });
  const list = fk.createUIListLayout({
    FillDirection: 'Horizontal',
    Padding: fk.udim(0, 8),
    Wraps: true,
  });
  const tagsContent = [
    { label: 'ONE', accent: colors.coral },
    { label: 'TWO', accent: colors.mint },
    { label: 'THREE', accent: colors.amber },
  ] as const;
  for (const [index, tagContent] of tagsContent.entries()) {
    const tag = fk.createTextLabel({
      Size: fk.udim2FromOffset(76, 34),
      Position: fk.udim2FromOffset(10 + index * 22, 10 + index * 12),
      BackgroundColor3: tagContent.accent,
      Text: tagContent.label,
      TextColor3: colors.ink,
      TextSize: 9,
      FontFamily: fonts.mono,
      FontWeight: 800,
      LayoutOrder: index,
    });
    fk.append(tag, fk.createUICorner({ CornerRadius: 9 }));
    fk.append(tags, tag);
  }
  fk.append(tags, list);
  fk.append(card, tags);
  const tree = createText({
    text: '',
    size: fk.udim2FromOffset(270, 60),
    position: fk.udim2FromOffset(22, 270),
    color: colors.violet,
    textSize: 10,
    font: fonts.mono,
    wrapped: true,
    yAlignment: 'Top',
  });
  fk.append(card, tree);
  fk.append(preview, card);
  fk.append(content, preview);
  const explanation = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 340),
    Position: fk.udim2FromOffset(0, 940),
    BackgroundColor3: colors.ink,
  });
  addRoundedBorder(explanation, 18, colors.inkSoft);
  appendCodeLine(explanation, '// Modifiers are ordinary child nodes', 20, colors.textMuted);
  const lineOne = appendCodeLine(explanation, '', 64, colors.coral);
  const lineTwo = appendCodeLine(explanation, '', 102, colors.violet);
  const lineThree = appendCodeLine(explanation, '', 140, colors.mint);
  const lineFour = appendCodeLine(explanation, '', 178, colors.amber);
  fk.append(
    explanation,
    createText({
      text: 'Stroke grows into a stronger edge. Shadow adds directional depth, glow blooms around the silhouette, and padding moves every tag inward.',
      size: fk.udim2FromOffset(310, 88),
      position: fk.udim2FromOffset(22, 226),
      color: colors.textMuted,
      textSize: 13,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  fk.append(content, explanation);
  const strokeMotion = fk.createMotion(stroke);
  const shadowMotion = fk.createMotion(shadow);
  const glowMotion = fk.createMotion(glow);
  const paddingMotion = fk.createMotion(padding);
  const toggleStroke = createSpringModifierToggle({
    parent: card,
    modifier: stroke,
    motion: strokeMotion,
    active: { Thickness: 4 },
    inactive: { Thickness: 0 },
    isActive: () => enabled.get().stroke,
  });
  const toggleShadow = createSpringModifierToggle({
    parent: card,
    modifier: shadow,
    motion: shadowMotion,
    active: {
      Transparency: 0.3,
      Offset: fk.vector2(10, 16),
      BlurRadius: 16,
      SpreadRadius: -2,
    },
    inactive: {
      Transparency: 1,
      Offset: fk.vector2(0, 0),
      BlurRadius: 0,
      SpreadRadius: -2,
    },
    isActive: () => enabled.get().shadow,
  });
  const toggleGlow = createSpringModifierToggle({
    parent: card,
    modifier: glow,
    motion: glowMotion,
    active: { Transparency: 0.18, Radius: 32 },
    inactive: { Transparency: 1, Radius: 0 },
    isActive: () => enabled.get().glow,
  });
  const togglePadding = createSpringModifierToggle({
    parent: tags,
    modifier: padding,
    motion: paddingMotion,
    active: {
      PaddingTop: fk.udim(0, 12),
      PaddingRight: fk.udim(0, 12),
      PaddingBottom: fk.udim(0, 12),
      PaddingLeft: fk.udim(0, 12),
    },
    inactive: {
      PaddingTop: fk.udim(0, 0),
      PaddingRight: fk.udim(0, 0),
      PaddingBottom: fk.udim(0, 0),
      PaddingLeft: fk.udim(0, 0),
    },
    isActive: () => enabled.get().padding,
  });
  fk.state.observe(card, enabled, (value) => {
    setModifierAttached(card, corner, value.corner);
    toggleStroke(value.stroke);
    toggleShadow(value.shadow);
    toggleGlow(value.glow);
    togglePadding(value.padding);
    setModifierAttached(tags, list, value.layout);
    for (const [key, control] of controls) {
      const active = value[key];
      fk.update(control, {
        Text: `${active ? '●' : '○'}  ${key.toUpperCase()}`,
        BackgroundColor3: active ? colors.coral : colors.ink,
        TextColor3: active ? colors.ink : colors.text,
      });
    }
    fk.update(tree, { Text: describeModifierTree(value) });
    fk.update(lineOne, {
      Text: `fk.spring(stroke, { Thickness: ${value.stroke ? '4' : '0'} });`,
    });
    fk.update(lineTwo, {
      Text: `fk.spring(shadow, { Offset: ${value.shadow ? '[10, 16]' : '[0, 0]'} });`,
    });
    fk.update(lineThree, {
      Text: `fk.spring(glow, { Radius: ${value.glow ? '32' : '0'} });`,
    });
    fk.update(lineFour, {
      Text: `fk.spring(padding, { all: ${value.padding ? '12' : '0'} });`,
    });
  });
  fk.append(section, content);
  return section;
}

function describeModifierTree(state: ComposerState): string {
  const cardStyle = [
    modifierLabel(state.corner, 'UICorner'),
    modifierLabel(state.stroke, 'UIStroke'),
  ].join('  ');
  const cardEffects = [
    modifierLabel(state.shadow, 'UIShadow'),
    modifierLabel(state.glow, 'UIGlow'),
  ].join('  ');
  const tagModifiers = [
    modifierLabel(state.padding, 'UIPadding'),
    modifierLabel(state.layout, 'UIListLayout'),
  ].join('  ');
  return `▼ Card\n  ${cardStyle}\n  ${cardEffects}\n  Tags → ${tagModifiers}`;
}

function modifierLabel(enabled: boolean, label: string): string {
  return enabled ? label : '—';
}
