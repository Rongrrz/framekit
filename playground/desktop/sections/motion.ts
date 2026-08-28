import { fk, fka } from 'framekit';

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

type DemoMode = 'calm' | 'focus' | 'play' | 'orbit';

const { top, height } = sectionLayout.motion;

const goals = {
  calm: {
    Position: fk.udim2FromOffset(170, 126),
    Rotation: 0,
    BackgroundColor3: colors.mint,
    Scale: 1,
  },
  focus: {
    Position: fk.udim2FromOffset(266, 82),
    Rotation: -5,
    BackgroundColor3: colors.violet,
    Scale: 1.08,
  },
  play: {
    Position: fk.udim2FromOffset(92, 190),
    Rotation: 7,
    BackgroundColor3: colors.coral,
    Scale: 0.95,
  },
  orbit: {
    Position: fk.udim2FromOffset(304, 212),
    Rotation: 12,
    BackgroundColor3: colors.amber,
    Scale: 0.88,
  },
} as const;

export function createMotionSection(): fk.FrameNode {
  const section = pageSection('Motion', top, height, colors.ink);

  const content = sectionContent();

  const mode = fk.createValue<DemoMode>('calm');

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

  const modeButtons = new Map<DemoMode, fk.TextButtonNode>();

  const modes: readonly [DemoMode, string, fk.Color3][] = [
    ['calm', 'CALM', colors.mint],
    ['focus', 'FOCUS', colors.violet],
    ['play', 'PLAY', colors.coral],
    ['orbit', 'ORBIT', colors.amber],
  ];
  for (const [index, [value, label, accent]] of modes.entries()) {
    const control = createButton(
      label,
      fk.udim2FromOffset(76, 44),
      fk.udim2FromOffset(28 + index * 84, 330),
      colors.inkSoft,
      colors.text,
    );
    control.setProperties({ TextSize: 11 });
    bindButtonMotion(control, colors.inkSoft, accent);
    control.onClick(() => mode.set(value));
    modeButtons.set(value, control);
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
    Position: goals.calm.Position,
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

  const springController = fka.spring(demoCard);
  springController.completed.subscribe(() => status.setProperties({ Text: '● SPRING SETTLED' }));
  demoCard.watch(mode, (value) => {
    const goal = goals[value];
    status.setProperties({
      Text: `● MOVING TO ${value.toUpperCase()}`,
      TextColor3: goal.BackgroundColor3,
    });
    positionLine.setProperties({ Text: `  Position: ${value}Position,` });
    rotationLine.setProperties({ Text: `  Rotation: ${goal.Rotation},` });
    cardStatus.setProperties({
      Text: `${value.toUpperCase()}  •  Position  •  Rotation  •  Scale`,
    });
    fka.spring(demoCard, {
      Position: goal.Position,
      Rotation: goal.Rotation,
      BackgroundColor3: goal.BackgroundColor3,
    });
    fka.spring(demoScale, { Scale: goal.Scale });
    for (const [buttonMode, control] of modeButtons) {
      control.setProperties({
        TextColor3: buttonMode === value ? goal.BackgroundColor3 : colors.text,
      });
    }
  });

  content.addChild(lab);

  section.addChild(content);
  return section;
}
