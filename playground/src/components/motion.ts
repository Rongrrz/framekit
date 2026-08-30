import { fk, fka } from 'framekit';

import { bindButtonMotion } from '../behaviors/hover-motion';
import { bindLayoutProperties, type PlaygroundLayout, type Responsive } from '../layout';
import { appendSectionHeading, createSection, createSectionContent } from '../section';
import { colors, fonts } from '../theme';
import { addRoundedBorder, appendCodeLine, createButton, createText } from '../ui';

const motionGoals = {
  calm: { label: 'CALM', accent: colors.mint, rotation: 0, scale: 1 },
  focus: { label: 'FOCUS', accent: colors.violet, rotation: -5, scale: 1.08 },
  play: { label: 'PLAY', accent: colors.coral, rotation: 7, scale: 0.94 },
  orbit: { label: 'ORBIT', accent: colors.amber, rotation: 11, scale: 0.86 },
} as const;

type MotionMode = keyof typeof motionGoals;

const motionModeOrder: readonly MotionMode[] = ['calm', 'focus', 'play', 'orbit'];

const motionPositions: Responsive<Readonly<Record<MotionMode, fk.UDim2>>> = {
  desktop: {
    calm: fk.udim2FromOffset(128, 116),
    focus: fk.udim2FromOffset(170, 70),
    play: fk.udim2FromOffset(66, 184),
    orbit: fk.udim2FromOffset(196, 198),
  },
  mobile: {
    calm: fk.udim2FromOffset(48, 110),
    focus: fk.udim2FromOffset(68, 72),
    play: fk.udim2FromOffset(26, 180),
    orbit: fk.udim2FromOffset(76, 194),
  },
};

export function createMotion(layout: fk.Value<PlaygroundLayout>): fk.Frame {
  const section = createSection('motion', layout, colors.ink);
  const content = createSectionContent(section, layout);
  appendSectionHeading(
    content,
    layout,
    'MOTION KEEPS ITS MOMENTUM.',
    'Choose goals quickly. The same spring retains position and velocity instead of restarting from scratch.',
    'light',
  );

  content.addChild(createMotionLab(layout));
  section.addChild(content);
  return section;
}

/** Owns the selected motion goal, its preview, and the matching code readout. */
function createMotionLab(layout: fk.Value<PlaygroundLayout>): fk.Frame {
  const lab = fk.createFrame({ Name: 'MotionLab', BackgroundColor3: colors.inkRaised });
  const selectedMode = fk.createValue<MotionMode>('calm');
  addRoundedBorder(lab, 22, colors.inkSoft, 2);
  bindLayoutProperties(lab, layout, lab, {
    desktop: {
      Size: fk.udim2FromOffset(1080, 556),
      Position: fk.udim2FromOffset(0, 236),
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 754),
      Position: fk.udim2FromOffset(0, 264),
    },
  });

  const controls = new Map<MotionMode, fk.TextButton>();
  for (const [index, mode] of motionModeOrder.entries()) {
    const goal = motionGoals[mode];
    const control = createButton(
      goal.label,
      fk.udim2FromOffset(72, 42),
      fk.udim2FromOffset(20 + index * 82, 22),
      colors.ink,
      colors.text,
    );
    control.setProperties({ TextSize: 9, FontFamily: fonts.mono });
    bindLayoutProperties(lab, layout, control, {
      desktop: {
        Size: fk.udim2FromOffset(122, 42),
        Position: fk.udim2FromOffset(24 + index * 132, 24),
      },
      mobile: {
        Size: fk.udim2FromOffset(72, 42),
        Position: fk.udim2FromOffset(20 + index * 82, 22),
      },
    });
    bindButtonMotion(control, colors.ink, goal.accent);
    control.onClick(() => selectedMode.set(mode));
    controls.set(mode, control);
    lab.addChild(control);
  }

  const stage = fk.createFrame({ BackgroundColor3: colors.paper, ClipsDescendants: true });
  addRoundedBorder(stage, 18, colors.paperMuted);
  bindLayoutProperties(lab, layout, stage, {
    desktop: {
      Size: fk.udim2FromOffset(520, 442),
      Position: fk.udim2FromOffset(24, 90),
    },
    mobile: {
      Size: fk.udim2FromOffset(318, 400),
      Position: fk.udim2FromOffset(20, 84),
    },
  });

  const card = fk.createFrame({ BackgroundColor3: colors.mint });
  const scale = fk.createUIScale();
  addRoundedBorder(card, 22, colors.ink, 2);
  card.addChild(scale);
  bindLayoutProperties(lab, layout, card, {
    desktop: { Size: fk.udim2FromOffset(260, 196) },
    mobile: { Size: fk.udim2FromOffset(220, 170) },
  });

  const cardTitle = createText({
    text: 'SPRING\nCONTROLLER',
    size: fk.udim2FromOffset(176, 90),
    position: fk.udim2FromOffset(22, 18),
    color: colors.ink,
    textSize: 23,
    weight: 900,
    wrapped: true,
    yAlignment: 'Top',
  });
  const stateLabel = createText({
    text: 'CALM',
    size: fk.udim2FromOffset(176, 28),
    position: fk.udim2FromOffset(22, 126),
    color: colors.inkSoft,
    textSize: 10,
    font: fonts.mono,
  });
  bindLayoutProperties(lab, layout, cardTitle, {
    desktop: {
      Size: fk.udim2FromOffset(212, 100),
      Position: fk.udim2FromOffset(24, 22),
      TextSize: 27,
    },
    mobile: {
      Size: fk.udim2FromOffset(176, 90),
      Position: fk.udim2FromOffset(22, 18),
      TextSize: 23,
    },
  });
  bindLayoutProperties(lab, layout, stateLabel, {
    desktop: {
      Size: fk.udim2FromOffset(212, 28),
      Position: fk.udim2FromOffset(24, 148),
    },
    mobile: {
      Size: fk.udim2FromOffset(176, 28),
      Position: fk.udim2FromOffset(22, 126),
    },
  });

  card.addChild(cardTitle);
  card.addChild(stateLabel);
  stage.addChild(card);
  lab.addChild(stage);

  const code = fk.createFrame({ BackgroundColor3: colors.ink });
  addRoundedBorder(code, 16, colors.inkSoft);
  bindLayoutProperties(lab, layout, code, {
    desktop: {
      Size: fk.udim2FromOffset(488, 442),
      Position: fk.udim2FromOffset(568, 90),
    },
    mobile: {
      Size: fk.udim2FromOffset(318, 226),
      Position: fk.udim2FromOffset(20, 508),
    },
  });

  const status = createText({
    text: '● SPRING SETTLED',
    size: fk.udim2(1, -40, 0, 28),
    position: fk.udim2FromOffset(20, 20),
    color: colors.mint,
    textSize: 10,
    font: fonts.mono,
  });
  code.addChild(status);
  appendCodeLine(code, 'fka.spring(card, {', 70, colors.coral);
  const positionLine = appendCodeLine(code, '  Position: calmPosition,', 112);
  const rotationLine = appendCodeLine(code, '  Rotation: 0,', 154);
  const colorLine = appendCodeLine(code, '  BackgroundColor3: colors.mint,', 196, colors.mint);
  const closingLine = appendCodeLine(code, '});', 238, colors.coral);
  bindLayoutProperties(lab, layout, closingLine, {
    desktop: { Visible: true },
    mobile: { Visible: false },
  });
  lab.addChild(code);

  const controller = fka.spring(card);
  controller.completed.subscribe(() => status.setProperties({ Text: '● SPRING SETTLED' }));

  function applyGoal(mode: MotionMode, animate: boolean): void {
    const goal = motionGoals[mode];
    const position = motionPositions[layout.get()][mode];
    stateLabel.Text = goal.label;
    status.setProperties({ Text: `● MOVING TO ${goal.label}`, TextColor3: goal.accent });
    positionLine.Text = `  Position: ${mode}Position,`;
    rotationLine.Text = `  Rotation: ${goal.rotation},`;
    colorLine.Text = `  BackgroundColor3: colors.${mode},`;

    for (const [controlMode, control] of controls) {
      control.TextColor3 = controlMode === mode ? goal.accent : colors.text;
    }

    if (animate) {
      fka.spring(card, {
        Position: position,
        Rotation: goal.rotation,
        BackgroundColor3: goal.accent,
      });
      fka.spring(scale, { Scale: goal.scale });
      return;
    }

    card.setProperties({
      Position: position,
      Rotation: goal.rotation,
      BackgroundColor3: goal.accent,
    });
    scale.Scale = goal.scale;
  }

  lab.watch(layout, () => applyGoal(selectedMode.get(), false));
  lab.watch(selectedMode, (mode) => applyGoal(mode, true));
  return lab;
}
