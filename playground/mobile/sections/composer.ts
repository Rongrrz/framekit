import { fk } from 'framekit';

import { bindScaleMotion } from '../../shared/interaction';
import { createSpringModifierToggle, setModifierAttached } from '../../shared/modifier';
import { button, codeLine, decorate, text } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { sectionLayout } from '../layout';
import {
  contentWidth,
  createSection,
  createSectionContent,
  appendSectionHeading,
} from '../primitives';

export function createComposer(): fk.FrameNode {
  const section = createSection('MobileComposer', sectionLayout.composer, colors.paper);
  const content = createSectionContent();
  appendSectionHeading(
    content,
    'ATTACH IT.\nSEE THE DIFFERENCE.',
    'These controls change real modifier nodes on the preview below.',
    true,
  );
  const enabled = fk.state.observable({
    corner: true,
    stroke: true,
    shadow: true,
    glow: true,
    padding: false,
    layout: true,
  });
  const controls = new Map<string, fk.TextButtonNode>();
  for (const [index, key] of [
    'corner',
    'stroke',
    'shadow',
    'glow',
    'padding',
    'layout',
  ].entries()) {
    const control = button(
      key.toUpperCase(),
      fk.udim2FromOffset(172, 46),
      fk.udim2FromOffset((index % 2) * 186, 226 + Math.floor(index / 2) * 60),
      colors.ink,
      colors.text,
    );
    fk.update(control, { TextSize: 10, FontFamily: fonts.mono });
    bindScaleMotion(control, 1.035);
    fk.on(control, 'MouseButton1Click', () => {
      const state = enabled();
      enabled({ ...state, [key]: !state[key as keyof typeof state] });
    });
    controls.set(key, control);
    fk.append(content, control);
  }
  const preview = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 480),
    Position: fk.udim2FromOffset(0, 428),
    BackgroundColor3: colors.paperRaised,
  });
  decorate(preview, 22, colors.paperMuted, 2);
  fk.append(
    preview,
    text({
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
    Thickness: 3,
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
    text({
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
  for (const [index, label] of ['ONE', 'TWO', 'THREE'].entries()) {
    const tag = fk.createTextLabel({
      Size: fk.udim2FromOffset(76, 34),
      Position: fk.udim2FromOffset(10 + index * 22, 10 + index * 12),
      BackgroundColor3: [colors.coral, colors.mint, colors.amber][index]!,
      Text: label,
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
  const tree = text({
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
  decorate(explanation, 18, colors.inkSoft);
  codeLine(explanation, '// Modifiers are ordinary child nodes', 20, colors.textMuted);
  const lineOne = codeLine(explanation, '', 64, colors.coral);
  const lineTwo = codeLine(explanation, '', 102, colors.violet);
  const lineThree = codeLine(explanation, '', 140, colors.mint);
  fk.append(
    explanation,
    text({
      text: 'Shadow springs toward directional depth. Glow blooms around the visible silhouette. Padding springs every tag inward.',
      size: fk.udim2FromOffset(310, 112),
      position: fk.udim2FromOffset(22, 196),
      color: colors.textMuted,
      textSize: 13,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  fk.append(content, explanation);
  const shadowMotion = fk.createMotion(shadow, { tension: 220, friction: 32 });
  const glowMotion = fk.createMotion(glow, { tension: 220, friction: 32 });
  const paddingMotion = fk.createMotion(padding, { tension: 240, friction: 34 });
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
    isActive: () => enabled().shadow,
  });
  const toggleGlow = createSpringModifierToggle({
    parent: card,
    modifier: glow,
    motion: glowMotion,
    active: { Transparency: 0.18, Radius: 32 },
    inactive: { Transparency: 1, Radius: 0 },
    isActive: () => enabled().glow,
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
    isActive: () => enabled().padding,
  });
  fk.state.observe(card, enabled, (value) => {
    setModifierAttached(card, corner, value.corner);
    setModifierAttached(card, stroke, value.stroke);
    toggleShadow(value.shadow);
    toggleGlow(value.glow);
    togglePadding(value.padding);
    setModifierAttached(tags, list, value.layout);
    for (const [key, control] of controls) {
      const active = value[key as keyof typeof value];
      fk.update(control, {
        Text: `${active ? '●' : '○'}  ${key.toUpperCase()}`,
        BackgroundColor3: active ? colors.coral : colors.ink,
        TextColor3: active ? colors.ink : colors.text,
      });
    }
    fk.update(tree, {
      Text: `▼ Card\n  ${value.corner ? 'UICorner' : '—'}  ${value.stroke ? 'UIStroke' : '—'}\n  ${value.shadow ? 'UIShadow' : '—'}  ${value.glow ? 'UIGlow' : '—'}\n  Tags → ${value.padding ? 'UIPadding' : '—'}  ${value.layout ? 'UIListLayout' : '—'}`,
    });
    fk.update(lineOne, {
      Text: `shadow.spring({ Offset: ${value.shadow ? '[10, 16]' : '[0, 0]'} });`,
    });
    fk.update(lineTwo, {
      Text: `glow.spring({ Radius: ${value.glow ? '32' : '0'} });`,
    });
    fk.update(lineThree, {
      Text: `padding.spring({ all: ${value.padding ? '12' : '0'} });`,
    });
  });
  fk.append(section, content);
  return section;
}
