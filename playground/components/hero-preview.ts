import { fk, fka, fkh } from 'framekit';

import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { colors, fonts } from '../theme';
import { addRoundedBorder, createButton, createText } from '../ui';

type PreviewMode = 'INSTANCE' | 'STATE' | 'MOTION';

const previewModes = {
  INSTANCE: {
    title: 'DIRECT INSTANCES',
    description:
      'Factories create persistent objects with typed properties and an explicit Parent.',
    accent: colors.coral,
    code: 'const card: fk.Frame = fk.createFrame({ ... });',
  },
  STATE: {
    title: 'PLAIN STATE',
    description:
      'Values are optional. Watch one when objects need to share state; skip it when they do not.',
    accent: colors.mint,
    code: 'card.watch(open, value => card.Visible = value);',
  },
  MOTION: {
    title: 'RETAINED MOTION',
    description:
      'Springs keep their velocity when a new goal arrives, so interaction stays continuous.',
    accent: colors.violet,
    code: 'fka.spring(card, { Position: nextPosition });',
  },
} as const satisfies Record<
  PreviewMode,
  Readonly<{ title: string; description: string; accent: fk.Color3; code: string }>
>;

const previewModeOrder: readonly PreviewMode[] = ['INSTANCE', 'STATE', 'MOTION'];

/** Shows the three ideas a new FrameKit user needs before building anything. */
export function createHeroPreview(layout: fk.Value<PlaygroundLayout>): fk.Frame {
  const selectedMode = fk.createValue<PreviewMode>('INSTANCE');
  const preview = fk.createFrame({ Name: 'HeroPreview', BackgroundColor3: colors.paper });
  addRoundedBorder(preview, 24, colors.violet, 2);

  bindLayoutProperties(preview, layout, preview, {
    desktop: {
      Size: fk.udim2FromOffset(500, 480),
      Position: fk.udim2FromOffset(580, 120),
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 340),
      Position: fk.udim2FromOffset(0, 520),
    },
  });

  const controls = new Map<PreviewMode, fk.TextButton>();
  for (const [index, mode] of previewModeOrder.entries()) {
    const control = createButton(
      mode,
      fk.udim2FromOffset(98, 38),
      fk.udim2FromOffset(18 + index * 112, 18),
      colors.paperMuted,
      colors.darkText,
    );
    control.setProperties({ TextSize: 9, FontFamily: fonts.mono });
    bindLayoutProperties(preview, layout, control, {
      desktop: {
        Size: fk.udim2FromOffset(142, 42),
        Position: fk.udim2FromOffset(18 + index * 160, 18),
      },
      mobile: {
        Size: fk.udim2FromOffset(98, 38),
        Position: fk.udim2FromOffset(18 + index * 112, 18),
      },
    });
    fkh.bindHoverScale(control, 1.04);
    control.onClick(() => selectedMode.set(mode));
    controls.set(mode, control);
    preview.addChild(control);
  }

  const card = fk.createFrame({ BackgroundColor3: colors.coral });
  addRoundedBorder(card, 18, colors.ink, 2);
  bindLayoutProperties(preview, layout, card, {
    desktop: {
      Size: fk.udim2FromOffset(464, 270),
      Position: fk.udim2FromOffset(18, 84),
    },
    mobile: {
      Size: fk.udim2FromOffset(322, 154),
      Position: fk.udim2FromOffset(18, 74),
    },
  });

  const title = createText({
    text: '',
    size: fk.udim2FromOffset(274, 46),
    position: fk.udim2FromOffset(24, 18),
    color: colors.ink,
    textSize: 21,
    weight: 900,
  });
  const description = createText({
    text: '',
    size: fk.udim2FromOffset(274, 70),
    position: fk.udim2FromOffset(24, 70),
    color: colors.inkSoft,
    textSize: 12,
    wrapped: true,
    yAlignment: 'Top',
  });
  bindLayoutProperties(preview, layout, title, {
    desktop: {
      Size: fk.udim2FromOffset(404, 54),
      Position: fk.udim2FromOffset(30, 34),
      TextSize: 28,
    },
    mobile: {
      Size: fk.udim2FromOffset(274, 46),
      Position: fk.udim2FromOffset(24, 18),
      TextSize: 21,
    },
  });
  bindLayoutProperties(preview, layout, description, {
    desktop: {
      Size: fk.udim2FromOffset(404, 96),
      Position: fk.udim2FromOffset(30, 104),
      TextSize: 15,
    },
    mobile: {
      Size: fk.udim2FromOffset(274, 70),
      Position: fk.udim2FromOffset(24, 70),
      TextSize: 12,
    },
  });

  const code = createText({
    text: '',
    size: fk.udim2FromOffset(322, 74),
    position: fk.udim2FromOffset(18, 250),
    color: colors.violet,
    textSize: 11,
    font: fonts.mono,
    wrapped: true,
    yAlignment: 'Top',
  });
  bindLayoutProperties(preview, layout, code, {
    desktop: {
      Size: fk.udim2FromOffset(464, 72),
      Position: fk.udim2FromOffset(18, 382),
      TextSize: 12,
    },
    mobile: {
      Size: fk.udim2FromOffset(322, 74),
      Position: fk.udim2FromOffset(18, 250),
      TextSize: 11,
    },
  });

  card.addChild(title);
  card.addChild(description);
  preview.addChild(card);
  preview.addChild(code);
  preview.watch(selectedMode, (modeName) => {
    const mode = previewModes[modeName];
    title.Text = mode.title;
    description.Text = mode.description;
    code.Text = mode.code;
    fka.spring(card, {
      BackgroundColor3: mode.accent,
      Rotation: modeName === 'MOTION' ? 2 : 0,
    });

    for (const [controlMode, control] of controls) {
      const selected = controlMode === modeName;
      control.setProperties({
        BackgroundColor3: selected ? mode.accent : colors.paperMuted,
        TextColor3: colors.darkText,
      });
    }
  });

  return preview;
}
