import { fk, fka } from 'framekit';

import { bindButtonMotion } from '../behaviors/hover-motion';
import { contentWidth, sectionLayout } from '../layout';
import { createSection, createSectionContent, appendSectionHeading } from '../section';
import { colors, fonts } from '../theme';
import { createButton, appendCodeLine, addRoundedBorder, createText } from '../ui';

const motionModes = [
  { key: 'calm', label: 'CALM', accent: colors.mint, rotation: 0, scale: 1 },
  { key: 'focus', label: 'FOCUS', accent: colors.violet, rotation: -5, scale: 1.08 },
  { key: 'play', label: 'PLAY', accent: colors.coral, rotation: 7, scale: 0.94 },
  { key: 'orbit', label: 'ORBIT', accent: colors.amber, rotation: 11, scale: 0.86 },
] as const;

type MotionMode = (typeof motionModes)[number]['key'];
type MotionGoal = (typeof motionModes)[number];
type MotionPositions = Readonly<Record<MotionMode, fk.UDim2>>;

const motionPositions = {
  calm: fk.udim2FromOffset(48, 110),
  focus: fk.udim2FromOffset(76, 72),
  play: fk.udim2FromOffset(28, 188),
  orbit: fk.udim2FromOffset(86, 204),
} satisfies MotionPositions;

export function createMotion(): fk.FrameNode {
  const section = createSection('Motion', sectionLayout.motion, colors.ink);

  const content = createSectionContent();
  appendSectionHeading(
    content,
    'RETARGET IT.\nTHE SPRING CONTINUES.',
    'Tap goals quickly. Position, size, rotation, color, and scale remain continuous.',
    'light',
  );

  const lab = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 820),
    Position: fk.udim2FromOffset(0, 238),
    BackgroundColor3: colors.inkRaised,
    ClipsDescendants: true,
  });
  addRoundedBorder(lab, 22, colors.inkSoft, 2);

  const mode = fk.createValue<MotionMode>('calm');
  for (const [index, goal] of motionModes.entries()) {
    const control = createButton(
      goal.label,
      fk.udim2FromOffset(72, 42),
      fk.udim2FromOffset(20 + index * 82, 24),
      colors.ink,
      colors.text,
    );
    control.setProperties({ TextSize: 9, FontFamily: fonts.mono });
    bindButtonMotion(control, colors.ink, goal.accent);
    control.onClick(() => mode.set(goal.key));
    lab.addChild(control);
  }

  const stage = fk.createFrame({
    Size: fk.udim2FromOffset(318, 420),
    Position: fk.udim2FromOffset(20, 92),
    BackgroundColor3: colors.paper,
    ClipsDescendants: true,
  });
  addRoundedBorder(stage, 18, colors.paperMuted);

  const card = fk.createFrame({
    Size: fk.udim2FromOffset(220, 170),
    Position: motionPositions.calm,
    BackgroundColor3: colors.mint,
  });
  addRoundedBorder(card, 22, colors.ink, 2);

  const scale = fk.createUIScale();

  card.addChild(scale);

  card.addChild(
    createText({
      text: 'SPRING\nCONTROLLER',
      size: fk.udim2FromOffset(176, 90),
      position: fk.udim2FromOffset(22, 18),
      color: colors.ink,
      textSize: 23,
      weight: 900,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  const stateLabel = createText({
    text: 'CALM',
    size: fk.udim2FromOffset(176, 28),
    position: fk.udim2FromOffset(22, 126),
    color: colors.inkSoft,
    textSize: 10,
    font: fonts.mono,
  });

  card.addChild(stateLabel);

  stage.addChild(card);

  lab.addChild(stage);

  const status = createText({
    text: '● SPRING SETTLED',
    size: fk.udim2FromOffset(318, 28),
    position: fk.udim2FromOffset(20, 536),
    color: colors.mint,
    textSize: 10,
    font: fonts.mono,
  });

  lab.addChild(status);

  const code = fk.createFrame({
    Size: fk.udim2FromOffset(318, 206),
    Position: fk.udim2FromOffset(20, 582),
    BackgroundColor3: colors.ink,
  });
  addRoundedBorder(code, 14, colors.inkSoft);
  appendCodeLine(code, 'fka.spring(card, {', 18, colors.coral);

  const positionLine = appendCodeLine(code, '  Position: calmPosition,', 48);

  const rotationLine = appendCodeLine(code, '  Rotation: 0,', 78);
  appendCodeLine(code, '  BackgroundColor3: accent,', 108);
  appendCodeLine(code, '});', 138, colors.coral);
  appendCodeLine(code, '', 168);

  bindMotionDemo({
    card,
    scale,
    selectedMode: mode,
    positions: motionPositions,
    onSettled: () => status.setProperties({ Text: '● SPRING SETTLED' }),
    onMoving: (goal) => {
      status.setProperties({ Text: `● MOVING TO ${goal.label}`, TextColor3: goal.accent });
      stateLabel.setProperties({ Text: goal.label });
      positionLine.setProperties({ Text: `  Position: ${goal.key}Position,` });
      rotationLine.setProperties({ Text: `  Rotation: ${goal.rotation},` });
    },
  });

  content.addChild(lab);

  section.addChild(content);
  return section;
}

function bindMotionDemo(options: {
  card: fk.FrameNode;
  scale: fk.UIScaleNode;
  selectedMode: fk.Value<MotionMode>;
  positions: MotionPositions;
  onMoving: (goal: MotionGoal) => void;
  onSettled: () => void;
}): void {
  const controller = fka.spring(options.card);
  controller.completed.subscribe(options.onSettled);

  options.card.watch(options.selectedMode, (mode) => {
    const goal = motionModes.find((candidate) => candidate.key === mode);
    if (!goal) return;

    options.onMoving(goal);
    fka.spring(options.card, {
      Position: options.positions[mode],
      Rotation: goal.rotation,
      BackgroundColor3: goal.accent,
    });
    fka.spring(options.scale, { Scale: goal.scale });
  });
}
