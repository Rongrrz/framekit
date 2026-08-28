import { fk } from 'framekit';

import { bindButtonMotion } from '../../shared/interaction';
import { createButton, appendCodeLine, addRoundedBorder, createText } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { sectionLayout } from '../layout';
import {
  contentWidth,
  createSection,
  createSectionContent,
  appendSectionHeading,
} from '../primitives';

const motionGoals = [
  {
    label: 'CALM',
    accent: colors.mint,
    position: fk.udim2FromOffset(48, 110),
    rotation: 0,
    scale: 1,
  },
  {
    label: 'FOCUS',
    accent: colors.violet,
    position: fk.udim2FromOffset(76, 72),
    rotation: -5,
    scale: 1.08,
  },
  {
    label: 'PLAY',
    accent: colors.coral,
    position: fk.udim2FromOffset(28, 188),
    rotation: 7,
    scale: 0.94,
  },
  {
    label: 'ORBIT',
    accent: colors.amber,
    position: fk.udim2FromOffset(86, 204),
    rotation: 11,
    scale: 0.86,
  },
] as const;

export function createMotion(): fk.FrameNode {
  const section = createSection('MobileMotion', sectionLayout.motion, colors.ink);

  const content = createSectionContent();
  appendSectionHeading(
    content,
    'RETARGET IT.\nTHE SPRING CONTINUES.',
    'Tap goals quickly. Position, size, rotation, color, and scale remain continuous.',
    false,
  );

  const lab = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 820),
    Position: fk.udim2FromOffset(0, 238),
    BackgroundColor3: colors.inkRaised,
    ClipsDescendants: true,
  });
  addRoundedBorder(lab, 22, colors.inkSoft, 2);

  const mode = fk.createValue(0);
  for (const [index, goal] of motionGoals.entries()) {
    const control = createButton(
      goal.label,
      fk.udim2FromOffset(72, 42),
      fk.udim2FromOffset(20 + index * 82, 24),
      colors.ink,
      colors.text,
    );
    control.setProperties({ TextSize: 9, FontFamily: fonts.mono });
    bindButtonMotion(control, colors.ink, goal.accent);
    control.onClick(() => mode.set(index));
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
    Position: fk.udim2FromOffset(48, 110),
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
  appendCodeLine(code, 'fk.spring(card, {', 18, colors.coral);

  const positionLine = appendCodeLine(code, '  Position: calmPosition,', 48);

  const rotationLine = appendCodeLine(code, '  Rotation: 0,', 78);
  appendCodeLine(code, '  BackgroundColor3: accent,', 108);
  appendCodeLine(code, '});', 138, colors.coral);
  appendCodeLine(code, '', 168);

  const cardMotion = fk.createMotion(card);

  const scaleMotion = fk.createMotion(scale);
  cardMotion.completed.subscribe(() => status.setProperties({ Text: '● SPRING SETTLED' }));
  card.watch(mode, (value) => {
    const goal = motionGoals[value];
    if (!goal) return;
    status.setProperties({ Text: `● MOVING TO ${goal.label}`, TextColor3: goal.accent });
    stateLabel.setProperties({ Text: goal.label });
    positionLine.setProperties({ Text: `  Position: ${goal.label.toLowerCase()}Position,` });
    rotationLine.setProperties({ Text: `  Rotation: ${goal.rotation},` });
    cardMotion.spring({
      Position: goal.position,
      Rotation: goal.rotation,
      BackgroundColor3: goal.accent,
    });
    scaleMotion.spring({ Scale: goal.scale });
  });

  content.addChild(lab);

  section.addChild(content);
  return section;
}
