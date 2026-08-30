import { fk, fka, fkh } from 'framekit';

import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { createSection, createSectionContent } from '../section';
import { colors, fonts } from '../theme';
import { addRoundedBorder, createButton, createText } from '../ui';

const propertyScenes = {
  position: {
    label: 'POSITION',
    accent: colors.cyan,
    position: fk.udim2FromOffset(286, 92),
    rotation: -4,
    line: 'Position: pointer',
  },
  rotation: {
    label: 'ROTATION',
    accent: colors.coral,
    position: fk.udim2FromOffset(96, 188),
    rotation: 14,
    line: 'Rotation: 14',
  },
  color: {
    label: 'COLOR',
    accent: colors.mint,
    position: fk.udim2FromOffset(224, 230),
    rotation: 2,
    line: 'BackgroundColor3: acid',
  },
} as const;

type PropertyScene = keyof typeof propertyScenes;

export function createApi(layout: fk.Value<PlaygroundLayout>): fk.Frame {
  const section = createSection('api', layout, colors.mint);
  const content = createSectionContent(section, layout);
  const eyebrow = createText({
    text: 'THE MOTION GRAMMAR',
    size: fk.udim2FromOffset(300, 28),
    position: fk.udim2FromOffset(0, 62),
    color: colors.darkMuted,
    textSize: 9,
    font: fonts.mono,
    weight: 800,
  });
  const title = createText({
    text: 'ONE CALL.\nANY PROPERTY.\nNO DRIFT.',
    size: fk.udim2FromOffset(548, 250),
    position: fk.udim2FromOffset(0, 112),
    color: colors.ink,
    textSize: 58,
    font: fonts.display,
    weight: 950,
    wrapped: true,
    yAlignment: 'Top',
  });
  const body = createText({
    text: 'Spring and tween share the same property ownership. New goals inherit the current visual state. Direct writes take control immediately.',
    size: fk.udim2FromOffset(500, 98),
    position: fk.udim2FromOffset(0, 398),
    color: colors.darkMuted,
    textSize: 15,
    wrapped: true,
    yAlignment: 'Top',
  });
  bindLayoutProperties(section, layout, eyebrow, {
    desktop: { Position: fk.udim2FromOffset(0, 62) },
    mobile: { Position: fk.udim2FromOffset(0, 50) },
  });
  bindLayoutProperties(section, layout, title, {
    desktop: {
      Size: fk.udim2FromOffset(548, 250),
      Position: fk.udim2FromOffset(0, 112),
      TextSize: 58,
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 200),
      Position: fk.udim2FromOffset(0, 94),
      TextSize: 41,
    },
  });
  bindLayoutProperties(section, layout, body, {
    desktop: {
      Size: fk.udim2FromOffset(500, 98),
      Position: fk.udim2FromOffset(0, 398),
      TextSize: 15,
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 112),
      Position: fk.udim2FromOffset(0, 310),
      TextSize: 13,
    },
  });

  const grammar = createMotionGrammar(layout);
  for (const child of [eyebrow, title, body, grammar]) content.addChild(child);
  section.addChild(content);
  return section;
}

function createMotionGrammar(layout: fk.Value<PlaygroundLayout>): fk.Frame {
  const panel = fk.createFrame({ Name: 'MotionGrammar', BackgroundColor3: colors.ink });
  addRoundedBorder(panel, 28, colors.darkText, 3);
  panel.element.classList.add('fk-noise');
  bindLayoutProperties(panel, layout, panel, {
    desktop: { Size: fk.udim2FromOffset(570, 680), Position: fk.udim2FromOffset(590, 58) },
    mobile: { Size: fk.udim2FromOffset(358, 546), Position: fk.udim2FromOffset(0, 452) },
  });

  panel.addChild(
    createText({
      text: 'fka.spring(node, {',
      size: fk.udim2(1, -48, 0, 36),
      position: fk.udim2FromOffset(24, 24),
      color: colors.coral,
      textSize: 13,
      font: fonts.mono,
      weight: 700,
    }),
  );
  const propertyLine = createText({
    text: '  Position: pointer,',
    size: fk.udim2(1, -48, 0, 36),
    position: fk.udim2FromOffset(24, 60),
    color: colors.cyan,
    textSize: 13,
    font: fonts.mono,
  });
  panel.addChild(propertyLine);
  panel.addChild(
    createText({
      text: '});',
      size: fk.udim2(1, -48, 0, 36),
      position: fk.udim2FromOffset(24, 96),
      color: colors.coral,
      textSize: 13,
      font: fonts.mono,
    }),
  );

  const field = fk.createFrame({
    Size: fk.udim2(1, -48, 0, 390),
    Position: fk.udim2FromOffset(24, 152),
    BackgroundColor3: colors.inkRaised,
    ClipsDescendants: true,
  });
  addRoundedBorder(field, 20, colors.inkSoft);
  field.element.classList.add('fk-grid');
  bindLayoutProperties(panel, layout, field, {
    desktop: { Size: fk.udim2(1, -48, 0, 390), Position: fk.udim2FromOffset(24, 152) },
    mobile: { Size: fk.udim2(1, -40, 0, 286), Position: fk.udim2FromOffset(20, 146) },
  });

  const demo = fk.createFrame({
    Name: 'GrammarDemo',
    Size: fk.udim2FromOffset(210, 120),
    Position: fk.udim2FromOffset(286, 92),
    BackgroundColor3: colors.cyan,
    Rotation: -4,
  });
  addRoundedBorder(demo, 20, colors.text, 2);
  demo.addChild(
    createText({
      text: 'SAME NODE\nNEW INTENT',
      size: fk.udim2(1, -32, 1, -28),
      position: fk.udim2FromOffset(16, 14),
      color: colors.ink,
      textSize: 18,
      font: fonts.display,
      weight: 950,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  field.addChild(demo);
  panel.addChild(field);

  const controls = new Map<PropertyScene, fk.TextButton>();
  for (const [index, sceneName] of (Object.keys(propertyScenes) as PropertyScene[]).entries()) {
    const data = propertyScenes[sceneName];
    const control = createButton(
      data.label,
      fk.udim2FromOffset(158, 44),
      fk.udim2FromOffset(24 + index * 174, 570),
      colors.inkRaised,
      colors.text,
    );
    control.setProperties({ TextSize: 8, FontFamily: fonts.mono });
    fkh.bindHoverScale(control, 1.035);
    control.onClick(() => {
      propertyLine.setProperties({ Text: `  ${data.line},`, TextColor3: data.accent });
      const scale = layout.get() === 'mobile' ? 0.62 : 1;
      fka.spring(
        demo,
        {
          Position: fk.udim2FromOffset(
            data.position.X.Offset * scale,
            data.position.Y.Offset * scale,
          ),
          Rotation: data.rotation,
          BackgroundColor3: data.accent,
        },
        { tension: 200, friction: 18 },
      );
      for (const [otherName, other] of controls) {
        const active = otherName === sceneName;
        other.setProperties({
          BackgroundColor3: active ? data.accent : colors.inkRaised,
          TextColor3: active ? colors.ink : colors.text,
        });
      }
    });
    bindLayoutProperties(panel, layout, control, {
      desktop: {
        Size: fk.udim2FromOffset(158, 44),
        Position: fk.udim2FromOffset(24 + index * 174, 570),
      },
      mobile: {
        Size: fk.udim2FromOffset(96, 40),
        Position: fk.udim2FromOffset(20 + index * 105, 460),
      },
    });
    controls.set(sceneName, control);
    panel.addChild(control);
  }

  return panel;
}
