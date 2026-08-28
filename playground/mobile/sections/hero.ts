import { fk, fka, fkh } from 'framekit';

import { bindButtonMotion, copyCommand } from '../../shared/interaction';
import { createButton, addRoundedBorder, createPill, createText } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { sectionLayout } from '../layout';
import { contentWidth, createSection, createSectionContent } from '../primitives';

type PreviewMode = 'NODE' | 'STATE' | 'MOTION';

const previewModes: Readonly<
  Record<
    PreviewMode,
    Readonly<{
      title: string;
      description: string;
      accent: fk.Color3;
      code: string;
    }>
  >
> = {
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
};

const previewModeOrder: readonly PreviewMode[] = ['NODE', 'STATE', 'MOTION'];

export function createHero(onExplore: () => void): fk.FrameNode {
  const section = createSection('MobileHero', sectionLayout.hero, colors.ink);

  const content = createSectionContent();

  content.addChild(
    createPill(
      'GAME UI THINKING  ·  WEB NATIVE',
      fk.udim2FromOffset(282, 36),
      fk.udim2FromOffset(0, 54),
      colors.mint,
    ),
  );

  content.addChild(
    createText({
      text: 'Build the web\nlike a game UI.',
      size: fk.udim2FromOffset(contentWidth, 190),
      position: fk.udim2FromOffset(0, 116),
      textSize: 43,
      weight: 900,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  content.addChild(
    createText({
      text: 'Typed nodes, UDim2 layout, shared values, modifiers, tweens, and springs—without translating every idea into a CSS hierarchy.',
      size: fk.udim2FromOffset(contentWidth, 116),
      position: fk.udim2FromOffset(0, 318),
      color: colors.textMuted,
      textSize: 15,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  const explore = createButton(
    'TRY THE LIVE LAB  ↓',
    fk.udim2FromOffset(172, 50),
    fk.udim2FromOffset(0, 452),
    colors.coral,
    colors.ink,
  );
  bindButtonMotion(explore, colors.coral, colors.amber);
  explore.onClick(onExplore);

  content.addChild(explore);

  const install = createButton(
    'COPY INSTALL',
    fk.udim2FromOffset(172, 50),
    fk.udim2FromOffset(186, 452),
    colors.inkRaised,
    colors.text,
  );
  install.setProperties({ TextSize: 10, FontFamily: fonts.mono });
  bindButtonMotion(install, colors.inkRaised, colors.inkSoft);
  install.onClick(() => {
    void copyCommand(install, 'npm i framekit', 'COPY INSTALL');
  });

  content.addChild(install);

  const selected = fk.createValue<PreviewMode>('NODE');

  const preview = fk.createFrame({
    Name: 'MobileHeroPreview',
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
    control.onClick(() => selected.set(mode));
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

  card.addChild(title);

  card.addChild(description);

  preview.addChild(card);

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

  preview.addChild(code);
  preview.watch(selected, (value) => {
    const mode = previewModes[value];
    title.setProperties({ Text: mode.title });
    description.setProperties({ Text: mode.description });
    code.setProperties({ Text: mode.code });
    fka.spring(card, { BackgroundColor3: mode.accent, Rotation: value === 'MOTION' ? 2 : 0 });
    for (const [controlMode, control] of controls) {
      control.setProperties({
        BackgroundColor3: controlMode === value ? mode.accent : colors.paperMuted,
      });
    }
  });

  content.addChild(preview);

  section.addChild(content);
  return section;
}
