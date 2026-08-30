import { fk, fka, fkh } from 'framekit';

import { contentWidth } from '../layout';
import { colors, fonts } from '../theme';
import { createButton, addRoundedBorder, createText } from '../ui';

type PreviewMode = 'NODE' | 'STATE' | 'MOTION';

const previewModes = {
  NODE: {
    title: 'TYPED NODE',
    description: 'Factories create persistent nodes with a strict property contract.',
    accent: colors.coral,
    code: 'const card = fk.createFrame({ ... });',
  },
  STATE: {
    title: 'DIRECT STATE',
    description: 'An explicit shared value updates the same node without a component framework.',
    accent: colors.mint,
    code: 'const open = fk.createValue(false);',
  },
  MOTION: {
    title: 'RETAINED MOTION',
    description: 'A spring keeps current position and velocity when you give it a new goal.',
    accent: colors.violet,
    code: 'fka.spring(card, { Rotation: 4 });',
  },
} as const satisfies Record<
  PreviewMode,
  Readonly<{ title: string; description: string; accent: fk.Color3; code: string }>
>;

const previewModeOrder: readonly PreviewMode[] = ['NODE', 'STATE', 'MOTION'];

/** Creates the interactive mental-model preview shown inside the hero. */
export function createHeroPreview(): fk.FrameNode {
  const selectedMode = fk.createValue<PreviewMode>('NODE');
  const preview = fk.createFrame({
    Name: 'HeroPreview',
    Size: fk.udim2FromOffset(contentWidth, 360),
    Position: fk.udim2FromOffset(0, 548),
    BackgroundColor3: colors.paper,
  });
  addRoundedBorder(preview, 24, colors.violet, 2);

  const controls = new Map<PreviewMode, fk.TextButtonNode>();
  for (const [index, mode] of previewModeOrder.entries()) {
    const control = createButton(
      mode,
      fk.udim2FromOffset(98, 38),
      fk.udim2FromOffset(18 + index * 112, 18),
      colors.paperMuted,
      colors.darkText,
    );
    control.setProperties({ TextSize: 9, FontFamily: fonts.mono });
    fkh.bindHoverScale(control, 1.04);
    control.onClick(() => selectedMode.set(mode));
    controls.set(mode, control);
    preview.addChild(control);
  }

  const card = fk.createFrame({
    Size: fk.udim2FromOffset(322, 160),
    Position: fk.udim2FromOffset(18, 78),
    BackgroundColor3: colors.coral,
  });
  addRoundedBorder(card, 18, colors.ink, 2);

  const title = createText({
    text: '',
    size: fk.udim2FromOffset(274, 46),
    position: fk.udim2FromOffset(24, 20),
    color: colors.ink,
    textSize: 22,
    weight: 900,
  });
  const description = createText({
    text: '',
    size: fk.udim2FromOffset(274, 62),
    position: fk.udim2FromOffset(24, 72),
    color: colors.inkSoft,
    textSize: 12,
    wrapped: true,
    yAlignment: 'Top',
  });
  const code = createText({
    text: '',
    size: fk.udim2FromOffset(322, 74),
    position: fk.udim2FromOffset(18, 262),
    color: colors.violet,
    textSize: 11,
    font: fonts.mono,
    wrapped: true,
    yAlignment: 'Top',
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
      control.BackgroundColor3 = controlMode === modeName ? mode.accent : colors.paperMuted;
    }
  });

  return preview;
}
