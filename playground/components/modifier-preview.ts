import { fk, fka, fkh } from 'framekit';

import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { colors, fonts } from '../theme';
import { addRoundedBorder, createText } from '../ui';

export type ModifierKey = 'corner' | 'stroke' | 'shadow' | 'padding' | 'layout';
export type ModifierSelection = Readonly<Record<ModifierKey, boolean>>;

export const modifierKeys: readonly ModifierKey[] = [
  'corner',
  'stroke',
  'shadow',
  'padding',
  'layout',
];

export const initialModifierSelection: ModifierSelection = {
  corner: true,
  stroke: true,
  shadow: true,
  padding: false,
  layout: true,
};

/** Owns the real modifier instances and synchronizes them with the selected controls. */
export function createModifierPreview(
  layout: fk.Value<PlaygroundLayout>,
  selection: fk.Value<ModifierSelection>,
): fk.Frame {
  const preview = fk.createFrame({ Name: 'ModifierPreview', BackgroundColor3: colors.paperRaised });
  addRoundedBorder(preview, 22, colors.paperMuted, 2);
  bindLayoutProperties(preview, layout, preview, {
    desktop: {
      Size: fk.udim2FromOffset(520, 500),
      Position: fk.udim2FromOffset(0, 82),
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 486),
      Position: fk.udim2FromOffset(0, 198),
    },
  });

  const card = fk.createFrame({
    Name: 'NotificationCard',
    BackgroundColor3: colors.ink,
  });
  bindLayoutProperties(preview, layout, card, {
    desktop: {
      Size: fk.udim2FromOffset(452, 380),
      Position: fk.udim2FromOffset(34, 58),
    },
    mobile: {
      Size: fk.udim2FromOffset(314, 360),
      Position: fk.udim2FromOffset(22, 70),
    },
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
      size: fk.udim2(1, -44, 0, 42),
      position: fk.udim2FromOffset(22, 18),
      textSize: 21,
      weight: 900,
    }),
  );
  card.addChild(
    createText({
      text: 'Each visual behavior below is a child instance you can inspect, remove, or reuse.',
      size: fk.udim2(1, -44, 0, 70),
      position: fk.udim2FromOffset(22, 68),
      color: colors.textMuted,
      textSize: 12,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  const tags = fk.createFrame({
    Name: 'FeatureTags',
    Size: fk.udim2(1, -44, 0, 94),
    Position: fk.udim2FromOffset(22, 152),
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

  for (const [index, tag] of [
    { label: 'ONE', accent: colors.coral },
    { label: 'TWO', accent: colors.mint },
    { label: 'THREE', accent: colors.amber },
  ].entries()) {
    const label = fk.createTextLabel({
      Size: fk.udim2FromOffset(76, 34),
      Position: fk.udim2FromOffset(10 + index * 22, 10 + index * 12),
      BackgroundColor3: tag.accent,
      Text: tag.label,
      TextColor3: colors.ink,
      TextSize: 9,
      FontFamily: fonts.mono,
      FontWeight: 800,
      LayoutOrder: index,
    });
    label.addChild(fk.createUICorner({ CornerRadius: 9 }));
    tags.addChild(label);
  }
  tags.addChild(list);
  card.addChild(tags);

  const tree = createText({
    text: '',
    size: fk.udim2(1, -44, 0, 92),
    position: fk.udim2FromOffset(22, 270),
    color: colors.violet,
    textSize: 10,
    font: fonts.mono,
    wrapped: true,
    yAlignment: 'Top',
  });
  card.addChild(tree);
  preview.addChild(card);

  card.watch(selection, (value) => {
    fkh.setModifierAttached(card, corner, value.corner);
    setAnimatedStroke(card, stroke, value.stroke);
    setAnimatedShadow(card, shadow, value.shadow);
    setAnimatedPadding(tags, padding, value.padding);
    fkh.setModifierAttached(tags, list, value.layout);
    tree.Text = describeModifierTree(value);
  });

  return preview;
}

function setAnimatedStroke(parent: fk.Frame, stroke: fk.UIStroke, enabled: boolean): void {
  if (!enabled) {
    fka.spring(stroke).stop();
    fkh.setModifierAttached(parent, stroke, false);
    return;
  }

  if (stroke.Parent !== parent) stroke.Thickness = 0;
  fkh.setModifierAttached(parent, stroke, true);
  fka.spring(stroke, { Thickness: 4 });
}

function setAnimatedShadow(parent: fk.Frame, shadow: fk.UIShadow, enabled: boolean): void {
  if (!enabled) {
    fka.spring(shadow).stop();
    fkh.setModifierAttached(parent, shadow, false);
    return;
  }

  if (shadow.Parent !== parent) {
    shadow.setProperties({ Transparency: 1, Offset: fk.vector2(0, 0), BlurRadius: 0 });
  }
  fkh.setModifierAttached(parent, shadow, true);
  fka.spring(shadow, {
    Transparency: 0.3,
    Offset: fk.vector2(10, 16),
    BlurRadius: 16,
  });
}

function setAnimatedPadding(parent: fk.Frame, padding: fk.UIPadding, enabled: boolean): void {
  if (!enabled) {
    fka.spring(padding).stop();
    fkh.setModifierAttached(parent, padding, false);
    return;
  }

  if (padding.Parent !== parent) {
    padding.setProperties({
      PaddingTop: fk.udim(0, 0),
      PaddingRight: fk.udim(0, 0),
      PaddingBottom: fk.udim(0, 0),
      PaddingLeft: fk.udim(0, 0),
    });
  }
  fkh.setModifierAttached(parent, padding, true);
  fka.spring(padding, {
    PaddingTop: fk.udim(0, 12),
    PaddingRight: fk.udim(0, 12),
    PaddingBottom: fk.udim(0, 12),
    PaddingLeft: fk.udim(0, 12),
  });
}

function describeModifierTree(state: ModifierSelection): string {
  const show = (enabled: boolean, label: string): string => (enabled ? label : '—');
  return [
    '▼ NotificationCard',
    `  ${show(state.corner, 'UICorner')}  ${show(state.stroke, 'UIStroke')}`,
    `  ${show(state.shadow, 'UIShadow')}`,
    `  ▼ FeatureTags  ${show(state.padding, 'UIPadding')}`,
    `    ${show(state.layout, 'UIListLayout')}`,
  ].join('\n');
}
