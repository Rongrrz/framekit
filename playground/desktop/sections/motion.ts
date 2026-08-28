import { fk } from 'framekit';

import {
  bindMotionDemo,
  motionModes,
  type MotionMode,
  type MotionPositions,
} from '../../features/motion';
import { bindButtonMotion } from '../../shared/interaction';
import {
  createButton,
  appendCodeLine,
  addRoundedBorder,
  createPill,
  createText,
} from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { contentWidth, pageSection, scaledPosition, scaledSize, sectionContent } from '../geometry';
import { sectionLayout } from '../layout';

const { top, height } = sectionLayout.motion;

const motionPositions = {
  calm: fk.udim2FromOffset(170, 126),
  focus: fk.udim2FromOffset(266, 82),
  play: fk.udim2FromOffset(92, 190),
  orbit: fk.udim2FromOffset(304, 212),
} satisfies MotionPositions;

export function createMotionSection(): fk.FrameNode {
  const section = pageSection('Motion', top, height, colors.ink);

  const content = sectionContent();

  const mode = fk.createValue<MotionMode>('calm');

  content.addChild(
    createPill(
      'LIVE MOTION LAB  ·  CLICK FAST',
      scaledSize(260, 38, contentWidth, height),
      scaledPosition(0, 62, contentWidth, height),
      colors.violet,
    ),
  );

  content.addChild(
    createText({
      text: 'Retarget the interface.\nThe spring handles the rest.',
      size: scaledSize(760, 128, contentWidth, height),
      position: scaledPosition(0, 116, contentWidth, height),
      textSize: 40,
      weight: 900,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  content.addChild(
    createText({
      text: 'Every button sets a new position, rotation, color, and scale. Current momentum carries into the next goal.',
      size: scaledSize(350, 96, contentWidth, height),
      position: scaledPosition(770, 126, contentWidth, height),
      color: colors.textMuted,
      textSize: 16,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  const lab = fk.createFrame({
    Name: 'MotionLab',
    Size: scaledSize(contentWidth, 560, contentWidth, height),
    Position: scaledPosition(0, 274, contentWidth, height),
    BackgroundColor3: colors.inkRaised,
    ClipsDescendants: true,
  });
  addRoundedBorder(lab, 26, colors.inkSoft, 2);

  const controls = fk.createFrame({
    Name: 'MotionControls',
    Size: fk.udim2FromOffset(390, 560),
    BackgroundColor3: colors.inkRaised,
  });

  controls.addChild(
    createText({
      text: 'RETAINED MOTION CONTROLLER',
      size: fk.udim2FromOffset(330, 30),
      position: fk.udim2FromOffset(28, 24),
      color: colors.textMuted,
      textSize: 10,
      font: fonts.mono,
      weight: 700,
    }),
  );

  const codePanel = fk.createFrame({
    Name: 'MotionCode',
    Size: fk.udim2FromOffset(334, 196),
    Position: fk.udim2FromOffset(28, 70),
    BackgroundColor3: colors.ink,
  });
  addRoundedBorder(codePanel, 16, colors.inkSoft);
  appendCodeLine(codePanel, 'fka.spring(card, {', 22, colors.coral);

  const positionLine = appendCodeLine(codePanel, '  Position: calmPosition,', 50);

  const rotationLine = appendCodeLine(codePanel, '  Rotation: 0,', 78);
  appendCodeLine(codePanel, '  BackgroundColor3: accent,', 106);
  appendCodeLine(codePanel, '});', 134, colors.coral);
  appendCodeLine(codePanel, '', 162);

  controls.addChild(codePanel);

  controls.addChild(
    createText({
      text: 'SEND A NEW GOAL',
      size: fk.udim2FromOffset(180, 28),
      position: fk.udim2FromOffset(28, 292),
      color: colors.textMuted,
      textSize: 10,
      font: fonts.mono,
      weight: 700,
    }),
  );

  const modeButtons = new Map<MotionMode, fk.TextButtonNode>();

  for (const [index, goal] of motionModes.entries()) {
    const control = createButton(
      goal.label,
      fk.udim2FromOffset(76, 44),
      fk.udim2FromOffset(28 + index * 84, 330),
      colors.inkSoft,
      colors.text,
    );
    control.setProperties({ TextSize: 11 });
    bindButtonMotion(control, colors.inkSoft, goal.accent);
    control.onClick(() => mode.set(goal.key));
    modeButtons.set(goal.key, control);
    controls.addChild(control);
  }

  const status = createText({
    text: '● SPRING SETTLED',
    size: fk.udim2FromOffset(328, 34),
    position: fk.udim2FromOffset(28, 408),
    color: colors.mint,
    textSize: 10,
    font: fonts.mono,
    wrapped: true,
  });

  controls.addChild(status);

  controls.addChild(
    createText({
      text: 'The controller stops itself after settling. Retargeting while it is moving keeps the current velocity.',
      size: fk.udim2FromOffset(328, 78),
      position: fk.udim2FromOffset(28, 454),
      color: colors.textMuted,
      textSize: 12,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  lab.addChild(controls);

  const stage = fk.createFrame({
    Name: 'MotionStage',
    Size: fk.udim2(1, -390, 1, 0),
    Position: fk.udim2FromOffset(390, 0),
    BackgroundColor3: colors.paper,
    ClipsDescendants: true,
  });

  const grid = fk.createFrame({
    Size: fk.udim2(1, -70, 1, -70),
    Position: fk.udim2FromOffset(35, 35),
    BackgroundColor3: colors.paperRaised,
  });
  addRoundedBorder(grid, 20, colors.paperMuted);

  stage.addChild(grid);
  for (let index = 0; index < 6; index += 1) {
    grid.addChild(
      createText({
        text: index % 2 === 0 ? '·' : '+',
        size: fk.udim2FromOffset(30, 30),
        position: fk.udim2FromOffset(35 + (index % 3) * 210, 28 + Math.floor(index / 3) * 410),
        color: colors.paperMuted,
        textSize: 20,
        font: fonts.mono,
      }),
    );
  }

  const demoCard = fk.createFrame({
    Name: 'SpringCard',
    Size: fk.udim2FromOffset(330, 250),
    Position: motionPositions.calm,
    BackgroundColor3: colors.mint,
    BackgroundTransparency: 0.04,
  });
  addRoundedBorder(demoCard, 26, colors.ink, 2);

  const demoScale = fk.createUIScale();

  demoCard.addChild(demoScale);

  demoCard.addChild(
    createText({
      text: 'MOTION,\nWITHOUT THE\nBOOKKEEPING.',
      size: fk.udim2FromOffset(270, 132),
      position: fk.udim2FromOffset(28, 22),
      color: colors.ink,
      textSize: 27,
      weight: 900,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  const cardStatus = createText({
    text: 'Position  •  Rotation  •  Scale',
    size: fk.udim2FromOffset(270, 28),
    position: fk.udim2FromOffset(28, 192),
    color: colors.inkSoft,
    textSize: 12,
    font: fonts.mono,
  });

  demoCard.addChild(cardStatus);

  stage.addChild(demoCard);

  lab.addChild(stage);

  bindMotionDemo({
    card: demoCard,
    scale: demoScale,
    selectedMode: mode,
    positions: motionPositions,
    onSettled: () => status.setProperties({ Text: '● SPRING SETTLED' }),
    onMoving: (goal) => {
      status.setProperties({
        Text: `● MOVING TO ${goal.label}`,
        TextColor3: goal.accent,
      });
      positionLine.setProperties({ Text: `  Position: ${goal.key}Position,` });
      rotationLine.setProperties({ Text: `  Rotation: ${goal.rotation},` });
      cardStatus.setProperties({
        Text: `${goal.label}  •  Position  •  Rotation  •  Scale`,
      });
      for (const [buttonMode, control] of modeButtons) {
        control.setProperties({
          TextColor3: buttonMode === goal.key ? goal.accent : colors.text,
        });
      }
    },
  });

  content.addChild(lab);

  section.addChild(content);
  return section;
}
