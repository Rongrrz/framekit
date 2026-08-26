import { fk } from 'framekit';

import { bindScaleMotion } from '../../shared/interaction';
import { setModifierAttached } from '../../shared/modifier';
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
  const enabled = fk.state.observable({ corner: true, stroke: true, padding: false, layout: true });
  const controls = new Map<string, fk.TextButtonNode>();
  for (const [index, key] of ['corner', 'stroke', 'padding', 'layout'].entries()) {
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
    Position: fk.udim2FromOffset(0, 368),
    BackgroundColor3: colors.inkRaised,
  });
  decorate(preview, 22, colors.inkSoft, 2);
  const card = fk.createFrame({
    Size: fk.udim2FromOffset(314, 336),
    Position: fk.udim2FromOffset(22, 56),
    BackgroundColor3: colors.ink,
  });
  const corner = fk.createUICorner({ CornerRadius: 24 });
  const stroke = fk.createUIStroke({
    Color: colors.violet,
    Thickness: 3,
    BorderStrokePosition: 'Outer',
  });
  fk.append(card, corner);
  fk.append(card, stroke);
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
  fk.append(
    card,
    text({
      text: 'Padding affects the tag container. Layout replaces the tags’ overlapping manual positions.',
      size: fk.udim2FromOffset(270, 72),
      position: fk.udim2FromOffset(22, 68),
      color: colors.textMuted,
      textSize: 12,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  const tags = fk.createFrame({
    Size: fk.udim2FromOffset(270, 94),
    Position: fk.udim2FromOffset(22, 156),
    BackgroundColor3: colors.inkSoft,
  });
  fk.append(tags, fk.createUICorner({ CornerRadius: 14 }));
  const padding = fk.createUIPadding({
    PaddingTop: fk.udim(0, 10),
    PaddingRight: fk.udim(0, 10),
    PaddingBottom: fk.udim(0, 10),
    PaddingLeft: fk.udim(0, 10),
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
    Position: fk.udim2FromOffset(0, 880),
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
      text: 'Turn LAYOUT off to restore the intentionally overlapping manual positions. Turn PADDING on to inset the flex layout from every edge.',
      size: fk.udim2FromOffset(310, 112),
      position: fk.udim2FromOffset(22, 196),
      color: colors.textMuted,
      textSize: 13,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  fk.append(content, explanation);
  fk.state.observe(card, enabled, (value) => {
    setModifierAttached(card, corner, value.corner);
    setModifierAttached(card, stroke, value.stroke);
    setModifierAttached(tags, padding, value.padding);
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
      Text: `▼ Card\n  ${value.corner ? 'UICorner' : '—'}  ${value.stroke ? 'UIStroke' : '—'}\n  Tags → ${value.padding ? 'UIPadding' : '—'}  ${value.layout ? 'UIListLayout' : '—'}`,
    });
    fk.update(lineOne, { Text: value.corner ? 'fk.append(card, corner);' : 'fk.detach(corner);' });
    fk.update(lineTwo, {
      Text: value.padding ? 'fk.append(tags, padding);' : 'fk.detach(padding);',
    });
    fk.update(lineThree, {
      Text: value.layout ? 'fk.append(tags, listLayout);' : 'fk.detach(listLayout);',
    });
  });
  fk.append(section, content);
  return section;
}
