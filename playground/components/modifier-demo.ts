import { fk, fka, fkh } from 'framekit';

import { contentWidth } from '../layout';
import { colors, fonts } from '../theme';
import { createButton, appendCodeLine, addRoundedBorder, createText } from '../ui';

type ModifierKey = 'corner' | 'stroke' | 'shadow' | 'padding' | 'layout';

type ComposerState = Readonly<Record<ModifierKey, boolean>>;

const modifierKeys: readonly ModifierKey[] = ['corner', 'stroke', 'shadow', 'padding', 'layout'];

/** Creates the live modifier controls, preview, and generated explanation. */
export function createModifierDemo(): fk.Frame {
  const demo = fk.createFrame({
    Name: 'ModifierDemo',
    Size: fk.udim2FromOffset(contentWidth, 1054),
    Position: fk.udim2FromOffset(0, 226),
    BackgroundTransparency: 1,
  });

  const enabled = fk.createValue<ComposerState>({
    corner: true,
    stroke: true,
    shadow: true,
    padding: false,
    layout: true,
  });

  const controls = new Map<ModifierKey, fk.TextButton>();
  for (const [index, key] of modifierKeys.entries()) {
    const control = createButton(
      key.toUpperCase(),
      fk.udim2FromOffset(172, 46),
      fk.udim2FromOffset((index % 2) * 186, Math.floor(index / 2) * 60),
      colors.ink,
      colors.text,
    );
    control.setProperties({ TextSize: 10, FontFamily: fonts.mono });
    fkh.bindHoverScale(control, 1.035);
    control.onClick(() => {
      enabled.update((state) => ({ ...state, [key]: !state[key] }));
    });
    controls.set(key, control);
    demo.addChild(control);
  }

  const preview = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 480),
    Position: fk.udim2FromOffset(0, 202),
    BackgroundColor3: colors.paperRaised,
  });
  addRoundedBorder(preview, 22, colors.paperMuted, 2);

  preview.addChild(
    createText({
      text: 'SHADOW ↓ DIRECTIONAL DEPTH',
      size: fk.udim2FromOffset(314, 28),
      position: fk.udim2FromOffset(22, 18),
      color: colors.darkMuted,
      textSize: 9,
      font: fonts.mono,
      weight: 750,
    }),
  );

  const card = fk.createFrame({
    Name: 'NotificationCard',
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

  card.addChild(corner);

  card.addChild(stroke);

  card.addChild(shadow);

  card.addChild(
    createText({
      text: 'MODIFIER STACK',
      size: fk.udim2FromOffset(270, 42),
      position: fk.udim2FromOffset(22, 18),
      textSize: 21,
      weight: 900,
    }),
  );

  const description = fk.createTextBox({
    Name: 'Description',
    Size: fk.udim2FromOffset(270, 72),
    Position: fk.udim2FromOffset(22, 68),
    BackgroundTransparency: 1,
    Text: 'This text is editable. Padding and layout affect the tags below.',
    TextColor3: colors.textMuted,
    TextSize: 12,
    TextWrapped: true,
    TextXAlignment: 'Left',
    TextYAlignment: 'Top',
    FontFamily: fonts.sans,
    MultiLine: true,
    PlaceholderText: 'Type a description…',
  });

  card.addChild(description);

  const tags = fk.createFrame({
    Name: 'FeatureTags',
    Size: fk.udim2FromOffset(270, 94),
    Position: fk.udim2FromOffset(22, 156),
    BackgroundColor3: colors.inkSoft,
  });

  tags.addChild(fk.createUICorner({ CornerRadius: 14 }));

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
    tag.addChild(fk.createUICorner({ CornerRadius: 9 }));
    tags.addChild(tag);
  }
  tags.addChild(list);

  card.addChild(tags);

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

  card.addChild(tree);

  preview.addChild(card);

  demo.addChild(preview);

  const explanation = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 340),
    Position: fk.udim2FromOffset(0, 714),
    BackgroundColor3: colors.ink,
  });
  addRoundedBorder(explanation, 18, colors.inkSoft);
  appendCodeLine(explanation, '// Modifiers are ordinary child nodes', 20, colors.textMuted);

  const lineOne = appendCodeLine(explanation, '', 64, colors.coral);

  const lineTwo = appendCodeLine(explanation, '', 102, colors.violet);

  const lineThree = appendCodeLine(explanation, '', 140, colors.mint);

  const lineFour = appendCodeLine(explanation, '', 178, colors.amber);

  explanation.addChild(
    createText({
      text: 'Stroke creates a stronger edge, shadow adds directional depth, and padding moves every tag inward.',
      size: fk.udim2FromOffset(310, 88),
      position: fk.udim2FromOffset(22, 226),
      color: colors.textMuted,
      textSize: 13,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  demo.addChild(explanation);

  card.watch(enabled, (value) => {
    fkh.setModifierAttached(card, corner, value.corner);
    if (value.stroke) {
      if (stroke.Parent !== card) stroke.setProperties({ Thickness: 0 });
      fkh.setModifierAttached(card, stroke, true);
      fka.spring(stroke, { Thickness: 4 });
    } else {
      fka.spring(stroke).stop();
      fkh.setModifierAttached(card, stroke, false);
    }
    if (value.shadow) {
      if (shadow.Parent !== card) {
        shadow.setProperties({
          Transparency: 1,
          Offset: fk.vector2(0, 0),
          BlurRadius: 0,
        });
      }
      fkh.setModifierAttached(card, shadow, true);
      fka.spring(shadow, {
        Transparency: 0.3,
        Offset: fk.vector2(10, 16),
        BlurRadius: 16,
      });
    } else {
      fka.spring(shadow).stop();
      fkh.setModifierAttached(card, shadow, false);
    }
    if (value.padding) {
      if (padding.Parent !== tags) {
        padding.setProperties({
          PaddingTop: fk.udim(0, 0),
          PaddingRight: fk.udim(0, 0),
          PaddingBottom: fk.udim(0, 0),
          PaddingLeft: fk.udim(0, 0),
        });
      }
      fkh.setModifierAttached(tags, padding, true);
      fka.spring(padding, {
        PaddingTop: fk.udim(0, 12),
        PaddingRight: fk.udim(0, 12),
        PaddingBottom: fk.udim(0, 12),
        PaddingLeft: fk.udim(0, 12),
      });
    } else {
      fka.spring(padding).stop();
      fkh.setModifierAttached(tags, padding, false);
    }
    fkh.setModifierAttached(tags, list, value.layout);
    for (const [key, control] of controls) {
      const active = value[key];
      control.setProperties({
        Text: `${active ? '●' : '○'}  ${key.toUpperCase()}`,
        BackgroundColor3: active ? colors.coral : colors.ink,
        TextColor3: active ? colors.ink : colors.text,
      });
    }
    tree.setProperties({ Text: describeModifierTree(value) });
    lineOne.setProperties({
      Text: `fka.spring(stroke, { Thickness: ${value.stroke ? '4' : '0'} });`,
    });
    lineTwo.setProperties({
      Text: `fka.spring(shadow, { Offset: ${value.shadow ? '[10, 16]' : '[0, 0]'} });`,
    });
    lineThree.setProperties({ Text: `shadow.Parent = ${value.shadow ? 'card' : 'undefined'};` });
    lineFour.setProperties({
      Text: `fka.spring(padding, { all: ${value.padding ? '12' : '0'} });`,
    });
  });

  return demo;
}

function describeModifierTree(state: ComposerState): string {
  const cardStyle = [
    modifierLabel(state.corner, 'UICorner'),
    modifierLabel(state.stroke, 'UIStroke'),
  ].join('  ');

  const cardEffects = modifierLabel(state.shadow, 'UIShadow');

  const tagModifiers = [
    modifierLabel(state.padding, 'UIPadding'),
    modifierLabel(state.layout, 'UIListLayout'),
  ].join('  ');
  return `▼ Card\n  ${cardStyle}\n  ${cardEffects}\n  Tags → ${tagModifiers}`;
}

function modifierLabel(enabled: boolean, label: string): string {
  return enabled ? label : '—';
}
