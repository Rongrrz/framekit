import { fk, fka } from 'framekit';

import { copyCommand } from '../behaviors/copy-button';
import { bindButtonMotion } from '../behaviors/hover-motion';
import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { createSection, createSectionContent } from '../section';
import { colors, fonts } from '../theme';
import { addRoundedBorder, createButton, createPill, createText } from '../ui';

type HeroMachine = Readonly<{ frame: fk.Frame; burst: () => void }>;

/** Opens the playground with an interactive piece of motion instead of a feature list. */
export function createHero(layout: fk.Value<PlaygroundLayout>, onExplore: () => void): fk.Frame {
  const section = createSection('hero', layout, colors.ink);
  section.element.classList.add('fk-noise');
  const content = createSectionContent(section, layout);

  const issue = createText({
    text: 'MOTION STUDY  /  001',
    size: fk.udim2FromOffset(260, 24),
    position: fk.udim2FromOffset(0, 108),
    color: colors.textMuted,
    textSize: 9,
    font: fonts.mono,
    weight: 800,
  });
  const pill = createPill(
    'TYPED  ·  RETAINED  ·  ALIVE',
    fk.udim2FromOffset(270, 38),
    fk.udim2FromOffset(0, 146),
    colors.mint,
  );
  const titleTop = createText({
    text: 'MAKE UI',
    size: fk.udim2FromOffset(580, 112),
    position: fk.udim2FromOffset(0, 206),
    textSize: 86,
    font: fonts.display,
    weight: 950,
    yAlignment: 'Top',
  });
  const titleBottom = createText({
    text: 'FEEL ALIVE.',
    size: fk.udim2FromOffset(610, 116),
    position: fk.udim2FromOffset(0, 304),
    color: colors.mint,
    textSize: 86,
    font: fonts.display,
    weight: 950,
    yAlignment: 'Top',
  });
  titleBottom.element.classList.add('fk-shimmer');
  const description = createText({
    text: 'FrameKit gives ordinary properties memory, velocity, and weight. Move your cursor through the field—this entire composition is a live instance tree.',
    size: fk.udim2FromOffset(530, 94),
    position: fk.udim2FromOffset(0, 438),
    color: colors.textMuted,
    textSize: 16,
    wrapped: true,
    yAlignment: 'Top',
  });

  const machine = createHeroMachine(layout);
  const explore = createButton(
    'ENTER THE REACTOR  ↓',
    fk.udim2FromOffset(230, 56),
    fk.udim2FromOffset(0, 566),
    colors.mint,
    colors.ink,
  );
  const burst = createButton(
    'BURST',
    fk.udim2FromOffset(120, 56),
    fk.udim2FromOffset(246, 566),
    colors.violet,
    colors.text,
  );
  const install = createButton(
    'COPY  npm i framekit',
    fk.udim2FromOffset(204, 44),
    fk.udim2FromOffset(0, 642),
    colors.inkRaised,
    colors.text,
  );
  install.setProperties({ TextSize: 9, FontFamily: fonts.mono });
  burst.Name = 'BURSTButton';
  bindButtonMotion(explore, colors.mint, colors.cyan);
  bindButtonMotion(burst, colors.violet, colors.coral);
  bindButtonMotion(install, colors.inkRaised, colors.inkSoft);
  explore.onClick(onExplore);
  burst.onClick(machine.burst);
  install.onClick(() => void copyCommand(install, 'npm i framekit', 'COPY  npm i framekit'));

  bindHeroLayout(section, layout, {
    issue,
    pill,
    titleTop,
    titleBottom,
    description,
    explore,
    burst,
    install,
  });

  for (const child of [
    issue,
    pill,
    titleTop,
    titleBottom,
    description,
    explore,
    burst,
    install,
    machine.frame,
  ]) {
    content.addChild(child);
  }
  section.addChild(content);
  return section;
}

function createHeroMachine(layout: fk.Value<PlaygroundLayout>): HeroMachine {
  const stage = fk.createFrame({
    Name: 'HeroMachine',
    BackgroundColor3: colors.inkRaised,
    ClipsDescendants: true,
  });
  addRoundedBorder(stage, 32, colors.inkSoft, 2);
  stage.element.classList.add('fk-grid');
  stage.element.style.cursor = 'crosshair';
  bindLayoutProperties(stage, layout, stage, {
    desktop: {
      Size: fk.udim2FromOffset(540, 666),
      Position: fk.udim2FromOffset(620, 112),
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 470),
      Position: fk.udim2FromOffset(0, 616),
    },
  });

  const cornerLabel = createText({
    text: 'LIVE FIELD',
    size: fk.udim2FromOffset(130, 24),
    position: fk.udim2FromOffset(24, 22),
    color: colors.mint,
    textSize: 8,
    font: fonts.mono,
    weight: 800,
  });
  const fps = createText({
    text: 'SPRING / 170 / 26 / 1',
    size: fk.udim2FromOffset(210, 24),
    position: fk.udim2(1, -234, 0, 22),
    color: colors.textMuted,
    textSize: 8,
    font: fonts.mono,
    xAlignment: 'Right',
  });
  stage.addChild(cornerLabel);
  stage.addChild(fps);

  const ringSizes = [380, 286, 194] as const;
  for (const [index, size] of ringSizes.entries()) {
    const ring = fk.createFrame({
      Size: fk.udim2FromOffset(size, size),
      AnchorPoint: fk.vector2(0.5, 0.5),
      Position: fk.udim2(0.5, 0, 0.5, 16),
      BackgroundTransparency: 1,
    });
    ring.addChild(fk.createUICorner({ CornerRadius: 999 }));
    ring.addChild(
      fk.createUIStroke({
        Color: index === 1 ? colors.violet : colors.mint,
        Transparency: 0.72,
        Thickness: index === 1 ? 2 : 1,
      }),
    );
    ring.element.classList.add(index % 2 === 0 ? 'fk-ring' : 'fk-ring-reverse');
    stage.addChild(ring);
  }

  const trail = [0, 1, 2].map((index) => {
    const follower = fk.createFrame({
      Name: `Trail${index + 1}`,
      Size: fk.udim2FromOffset(170 - index * 24, 170 - index * 24),
      Position: fk.udim2FromOffset(184 + index * 12, 246 + index * 12),
      BackgroundColor3: index === 0 ? colors.violet : colors.cyan,
      BackgroundTransparency: 0.82 + index * 0.05,
    });
    follower.addChild(fk.createUICorner({ CornerRadius: 999 }));
    stage.addChild(follower);
    return follower;
  });

  const core = fk.createFrame({
    Name: 'MotionCore',
    Size: fk.udim2FromOffset(250, 190),
    Position: fk.udim2FromOffset(145, 238),
    BackgroundColor3: colors.mint,
    Rotation: -3,
  });
  addRoundedBorder(core, 28, colors.text, 2);
  core.addChild(
    fk.createUIShadow({
      Color: colors.violet,
      Transparency: 0.15,
      Offset: fk.vector2(18, 24),
      BlurRadius: 36,
      SpreadRadius: 2,
    }),
  );
  core.addChild(
    fk.createUIGradient({
      Color: fk.colorSequence(colors.text, colors.mint),
      Rotation: 125,
    }),
  );
  core.addChild(
    createText({
      text: 'MOTION\nHAS MEMORY.',
      size: fk.udim2(1, -44, 0, 100),
      position: fk.udim2FromOffset(22, 22),
      color: colors.ink,
      textSize: 25,
      font: fonts.display,
      weight: 950,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  core.addChild(
    createText({
      text: 'MOVE THROUGH THE FIELD',
      size: fk.udim2(1, -44, 0, 24),
      position: fk.udim2FromOffset(22, 146),
      color: colors.darkMuted,
      textSize: 8,
      font: fonts.mono,
      weight: 800,
    }),
  );
  stage.addChild(core);

  const chips = [
    { label: 'VELOCITY', accent: colors.coral, x: 28, y: 96, className: 'fk-float-a' },
    { label: 'NO DRIFT', accent: colors.cyan, x: 382, y: 118, className: 'fk-float-b' },
    { label: 'RETARGET', accent: colors.amber, x: 42, y: 560, className: 'fk-float-b' },
  ] as const;
  for (const chipData of chips) {
    const chip = createPill(
      chipData.label,
      fk.udim2FromOffset(130, 34),
      fk.udim2FromOffset(chipData.x, chipData.y),
      chipData.accent,
    );
    chip.element.classList.add(chipData.className);
    bindLayoutProperties(stage, layout, chip, {
      desktop: { Visible: true },
      mobile: { Visible: chipData.label !== 'RETARGET' },
    });
    stage.addChild(chip);
  }

  function rest(): void {
    const mobile = layout.get() === 'mobile';
    fka.spring(core, {
      Position: fk.udim2FromOffset(mobile ? 74 : 145, mobile ? 154 : 238),
      Rotation: -3,
      BackgroundColor3: colors.mint,
    });
    for (const [index, follower] of trail.entries()) {
      fka.spring(follower, {
        Position: fk.udim2FromOffset(
          (mobile ? 100 : 184) + index * 12,
          (mobile ? 180 : 246) + index * 12,
        ),
      });
    }
  }

  function moveTo(clientX: number, clientY: number): void {
    const bounds = stage.element.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;
    const x = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    const y = Math.min(1, Math.max(0, (clientY - bounds.top) / bounds.height));
    const mobile = layout.get() === 'mobile';
    const targetX = (mobile ? 36 : 58) + x * (mobile ? 118 : 230);
    const targetY = (mobile ? 92 : 120) + y * (mobile ? 190 : 330);
    fka.spring(
      core,
      {
        Position: fk.udim2FromOffset(targetX, targetY),
        Rotation: (x - 0.5) * 14,
      },
      { tension: 190, friction: 22 },
    );
    for (const [index, follower] of trail.entries()) {
      fka.spring(
        follower,
        { Position: fk.udim2FromOffset(targetX + 38 + index * 10, targetY + 16 + index * 10) },
        { tension: 120 - index * 18, friction: 22 + index * 4 },
      );
    }
  }

  function burst(): void {
    const mobile = layout.get() === 'mobile';
    fka.spring(
      core,
      {
        Position: fk.udim2FromOffset(mobile ? 40 : 248, mobile ? 218 : 116),
        Rotation: 13,
        BackgroundColor3: colors.coral,
      },
      { tension: 260, friction: 15 },
    );
    for (const [index, follower] of trail.entries()) {
      fka.spring(follower, {
        Position: fk.udim2FromOffset(
          (mobile ? 184 : 54) + index * 34,
          (mobile ? 92 : 420) - index * 26,
        ),
        BackgroundColor3: index % 2 === 0 ? colors.cyan : colors.violet,
      });
    }
  }

  const listenerController = new AbortController();
  stage.element.addEventListener('pointermove', (event) => moveTo(event.clientX, event.clientY), {
    signal: listenerController.signal,
  });
  stage.element.addEventListener('pointerleave', rest, { signal: listenerController.signal });
  stage.onDestroy(() => listenerController.abort());
  stage.watch(layout, rest);

  return Object.freeze({ frame: stage, burst });
}

function bindHeroLayout(
  owner: fk.Instance,
  layout: fk.Value<PlaygroundLayout>,
  elements: Readonly<{
    issue: fk.TextLabel;
    pill: fk.TextLabel;
    titleTop: fk.TextLabel;
    titleBottom: fk.TextLabel;
    description: fk.TextLabel;
    explore: fk.TextButton;
    burst: fk.TextButton;
    install: fk.TextButton;
  }>,
): void {
  bindLayoutProperties(owner, layout, elements.issue, {
    desktop: { Position: fk.udim2FromOffset(0, 108) },
    mobile: { Position: fk.udim2FromOffset(0, 62) },
  });
  bindLayoutProperties(owner, layout, elements.pill, {
    desktop: { Position: fk.udim2FromOffset(0, 146) },
    mobile: { Position: fk.udim2FromOffset(0, 98) },
  });
  bindLayoutProperties(owner, layout, elements.titleTop, {
    desktop: {
      Size: fk.udim2FromOffset(580, 112),
      Position: fk.udim2FromOffset(0, 206),
      TextSize: 86,
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 76),
      Position: fk.udim2FromOffset(0, 166),
      TextSize: 52,
    },
  });
  bindLayoutProperties(owner, layout, elements.titleBottom, {
    desktop: {
      Size: fk.udim2FromOffset(610, 116),
      Position: fk.udim2FromOffset(0, 304),
      TextSize: 86,
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 78),
      Position: fk.udim2FromOffset(0, 226),
      TextSize: 52,
    },
  });
  bindLayoutProperties(owner, layout, elements.description, {
    desktop: {
      Size: fk.udim2FromOffset(530, 94),
      Position: fk.udim2FromOffset(0, 438),
      TextSize: 16,
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 112),
      Position: fk.udim2FromOffset(0, 320),
      TextSize: 14,
    },
  });
  bindLayoutProperties(owner, layout, elements.explore, {
    desktop: { Size: fk.udim2FromOffset(230, 56), Position: fk.udim2FromOffset(0, 566) },
    mobile: { Size: fk.udim2FromOffset(218, 52), Position: fk.udim2FromOffset(0, 458) },
  });
  bindLayoutProperties(owner, layout, elements.burst, {
    desktop: { Size: fk.udim2FromOffset(120, 56), Position: fk.udim2FromOffset(246, 566) },
    mobile: { Size: fk.udim2FromOffset(124, 52), Position: fk.udim2FromOffset(234, 458) },
  });
  bindLayoutProperties(owner, layout, elements.install, {
    desktop: { Position: fk.udim2FromOffset(0, 642) },
    mobile: { Position: fk.udim2FromOffset(0, 532) },
  });
}
