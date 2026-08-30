import { fk, fkh } from 'framekit';

import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { colors, fonts } from '../theme';
import { addRoundedBorder, appendCodeLine, createButton, createText } from '../ui';
import {
  createModifierPreview,
  initialModifierSelection,
  modifierKeys,
  type ModifierKey,
  type ModifierSelection,
} from './modifier-preview';

/** Coordinates modifier controls while child components own preview rendering. */
export function createModifierDemo(layout: fk.Value<PlaygroundLayout>): fk.Frame {
  const demo = fk.createFrame({ Name: 'ModifierDemo', BackgroundTransparency: 1 });
  const selection = fk.createValue<ModifierSelection>(initialModifierSelection);
  bindLayoutProperties(demo, layout, demo, {
    desktop: {
      Size: fk.udim2FromOffset(1080, 600),
      Position: fk.udim2FromOffset(0, 242),
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 900),
      Position: fk.udim2FromOffset(0, 246),
    },
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
    bindLayoutProperties(demo, layout, control, {
      desktop: {
        Size: fk.udim2FromOffset(200, 46),
        Position: fk.udim2FromOffset(index * 220, 12),
      },
      mobile: {
        Size: fk.udim2FromOffset(172, 46),
        Position: fk.udim2FromOffset((index % 2) * 186, Math.floor(index / 2) * 60),
      },
    });
    fkh.bindHoverScale(control, 1.035);
    control.onClick(() => selection.update((value) => ({ ...value, [key]: !value[key] })));
    controls.set(key, control);
    demo.addChild(control);
  }

  demo.addChild(createModifierPreview(layout, selection));
  demo.addChild(createModifierExplanation(layout, selection));
  demo.watch(selection, (value) => {
    for (const [key, control] of controls) {
      const active = value[key];
      control.setProperties({
        Text: `${active ? '●' : '○'}  ${key.toUpperCase()}`,
        BackgroundColor3: active ? colors.coral : colors.ink,
        TextColor3: active ? colors.ink : colors.text,
      });
    }
  });

  return demo;
}

function createModifierExplanation(
  layout: fk.Value<PlaygroundLayout>,
  selection: fk.Value<ModifierSelection>,
): fk.Frame {
  const explanation = fk.createFrame({ BackgroundColor3: colors.ink });
  addRoundedBorder(explanation, 18, colors.inkSoft);
  bindLayoutProperties(explanation, layout, explanation, {
    desktop: {
      Size: fk.udim2FromOffset(526, 500),
      Position: fk.udim2FromOffset(554, 82),
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 286),
      Position: fk.udim2FromOffset(0, 708),
    },
  });

  explanation.addChild(
    createText({
      text: 'THE TREE IS THE STYLE SYSTEM.',
      size: fk.udim2(1, -40, 0, 42),
      position: fk.udim2FromOffset(20, 22),
      color: colors.text,
      textSize: 18,
      weight: 900,
    }),
  );
  explanation.addChild(
    createText({
      text: 'Attach a modifier with Parent. Detach it to reuse it. There is no hidden stylesheet or render phase.',
      size: fk.udim2(1, -40, 0, 76),
      position: fk.udim2FromOffset(20, 72),
      color: colors.textMuted,
      textSize: 12,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  const strokeLine = appendCodeLine(explanation, '', 176, colors.coral);
  const shadowLine = appendCodeLine(explanation, '', 220, colors.violet);
  const paddingLine = appendCodeLine(explanation, '', 264, colors.mint);
  const layoutLine = appendCodeLine(explanation, '', 308, colors.amber);

  for (const line of [strokeLine, shadowLine, paddingLine, layoutLine]) {
    bindLayoutProperties(explanation, layout, line, {
      desktop: { Visible: true },
      mobile: { Visible: line === strokeLine || line === shadowLine },
    });
  }

  explanation.watch(selection, (value) => {
    strokeLine.Text = `stroke.Parent = ${value.stroke ? 'card' : 'undefined'};`;
    shadowLine.Text = `shadow.Parent = ${value.shadow ? 'card' : 'undefined'};`;
    paddingLine.Text = `padding.Parent = ${value.padding ? 'tags' : 'undefined'};`;
    layoutLine.Text = `layout.Parent = ${value.layout ? 'tags' : 'undefined'};`;
  });
  return explanation;
}
