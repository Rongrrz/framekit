import { fk } from 'framekit';

import { bindButtonMotion } from '../../shared/interaction';
import { button, codeLine, decorate, pill, text } from '../../shared/ui';
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

export function createMotion(): fk.FrameNode {
  const section = pageSection('Motion', top, height, colors.ink);
  const content = sectionContent();
  const mode = fk.state.observable<DemoMode>('calm');

  fk.append(
    content,
    pill(
      'LIVE MOTION LAB  ·  CLICK FAST',
      scaledSize(260, 38, contentWidth, height),
      scaledPosition(0, 62, contentWidth, height),
      colors.violet,
    ),
  );
  fk.append(
    content,
    text({
      text: 'Retarget the interface.\nThe spring handles the rest.',
      size: scaledSize(760, 128, contentWidth, height),
      position: scaledPosition(0, 116, contentWidth, height),
      textSize: 40,
      weight: 900,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  fk.append(
    content,
    text({
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
  decorate(lab, 26, colors.inkSoft, 2);

  const controls = fk.createFrame({
    Name: 'MotionControls',
    Size: fk.udim2FromOffset(390, 560),
    BackgroundColor3: colors.inkRaised,
  });
  fk.append(
    controls,
    text({
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
  decorate(codePanel, 16, colors.inkSoft);
  codeLine(codePanel, 'const motion = fk.createMotion(card);', 22, colors.violet);
  codeLine(codePanel, '', 50);
  codeLine(codePanel, 'motion.spring({', 78, colors.coral);
  const positionLine = codeLine(codePanel, '  Position: calmPosition,', 106);
  const rotationLine = codeLine(codePanel, '  Rotation: 0,', 134);
  codeLine(codePanel, '});', 162, colors.coral);
  fk.append(controls, codePanel);
  fk.append(
    controls,
    text({
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
    const control = button(
      label,
      fk.udim2FromOffset(76, 44),
      fk.udim2FromOffset(28 + index * 84, 330),
      colors.inkSoft,
      colors.text,
    );
    fk.update(control, { TextSize: 11 });
    bindButtonMotion(control, colors.inkSoft, accent);
    fk.on(control, 'MouseButton1Click', () => mode(value));
    modeButtons.set(value, control);
    fk.append(controls, control);
  }

  const status = text({
    text: '● SPRING SETTLED',
    size: fk.udim2FromOffset(328, 34),
    position: fk.udim2FromOffset(28, 408),
    color: colors.mint,
    textSize: 10,
    font: fonts.mono,
    wrapped: true,
  });
  fk.append(controls, status);
  fk.append(
    controls,
    text({
      text: 'The controller stops itself after settling. Retargeting while it is moving keeps the current velocity.',
      size: fk.udim2FromOffset(328, 78),
      position: fk.udim2FromOffset(28, 454),
      color: colors.textMuted,
      textSize: 12,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  fk.append(lab, controls);

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
  decorate(grid, 20, colors.paperMuted);
  fk.append(stage, grid);

  for (let index = 0; index < 6; index += 1) {
    fk.append(
      grid,
      text({
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
  decorate(demoCard, 26, colors.ink, 2);
  const demoScale = fk.createUIScale();
  fk.append(demoCard, demoScale);
  fk.append(
    demoCard,
    text({
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
  const cardStatus = text({
    text: 'Position  •  Rotation  •  Scale',
    size: fk.udim2FromOffset(270, 28),
    position: fk.udim2FromOffset(28, 192),
    color: colors.inkSoft,
    textSize: 12,
    font: fonts.mono,
  });
  fk.append(demoCard, cardStatus);
  fk.append(stage, demoCard);
  fk.append(lab, stage);

  const cardMotion = fk.createMotion(demoCard, { tension: 190, friction: 18 });
  const scaleMotion = fk.createMotion(demoScale, { tension: 220, friction: 19 });
  cardMotion.completed.subscribe(() => fk.update(status, { Text: '● SPRING SETTLED' }));
  fk.state.observe(demoCard, mode, (value) => {
    const goal = goals[value];
    fk.update(status, {
      Text: `● MOVING TO ${value.toUpperCase()}`,
      TextColor3: goal.BackgroundColor3,
    });
    fk.update(positionLine, { Text: `  Position: ${value}Position,` });
    fk.update(rotationLine, { Text: `  Rotation: ${goal.Rotation},` });
    fk.update(cardStatus, { Text: `${value.toUpperCase()}  •  Position  •  Rotation  •  Scale` });
    cardMotion.spring({
      Position: goal.Position,
      Rotation: goal.Rotation,
      BackgroundColor3: goal.BackgroundColor3,
    });
    scaleMotion.spring({ Scale: goal.Scale });
    for (const [buttonMode, control] of modeButtons) {
      fk.update(control, {
        TextColor3: buttonMode === value ? goal.BackgroundColor3 : colors.text,
      });
    }
  });

  fk.append(content, lab);
  fk.append(section, content);
  return section;
}
