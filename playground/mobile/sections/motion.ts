import { fk } from 'framekit';

import { bindButtonMotion } from '../../shared/interaction';
import { button, codeLine, decorate, text } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { sectionLayout } from '../layout';
import {
  contentWidth,
  createSection,
  createSectionContent,
  appendSectionHeading,
} from '../primitives';

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
  decorate(lab, 22, colors.inkSoft, 2);
  const mode = fk.state.observable(0);
  const accents = [colors.mint, colors.violet, colors.coral, colors.amber] as const;
  const labels = ['CALM', 'FOCUS', 'PLAY', 'ORBIT'] as const;
  for (const [index, label] of labels.entries()) {
    const control = button(
      label,
      fk.udim2FromOffset(72, 42),
      fk.udim2FromOffset(20 + index * 82, 24),
      colors.ink,
      colors.text,
    );
    fk.update(control, { TextSize: 9, FontFamily: fonts.mono });
    bindButtonMotion(control, colors.ink, accents[index]!);
    fk.on(control, 'MouseButton1Click', () => mode(index));
    fk.append(lab, control);
  }
  const stage = fk.createFrame({
    Size: fk.udim2FromOffset(318, 420),
    Position: fk.udim2FromOffset(20, 92),
    BackgroundColor3: colors.paper,
    ClipsDescendants: true,
  });
  decorate(stage, 18, colors.paperMuted);
  const card = fk.createFrame({
    Size: fk.udim2FromOffset(220, 170),
    Position: fk.udim2FromOffset(48, 110),
    BackgroundColor3: colors.mint,
  });
  decorate(card, 22, colors.ink, 2);
  const scale = fk.createUIScale();
  fk.append(card, scale);
  fk.append(
    card,
    text({
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
  const stateLabel = text({
    text: 'CALM',
    size: fk.udim2FromOffset(176, 28),
    position: fk.udim2FromOffset(22, 126),
    color: colors.inkSoft,
    textSize: 10,
    font: fonts.mono,
  });
  fk.append(card, stateLabel);
  fk.append(stage, card);
  fk.append(lab, stage);
  const status = text({
    text: '● SPRING SETTLED',
    size: fk.udim2FromOffset(318, 28),
    position: fk.udim2FromOffset(20, 536),
    color: colors.mint,
    textSize: 10,
    font: fonts.mono,
  });
  fk.append(lab, status);
  const code = fk.createFrame({
    Size: fk.udim2FromOffset(318, 206),
    Position: fk.udim2FromOffset(20, 582),
    BackgroundColor3: colors.ink,
  });
  decorate(code, 14, colors.inkSoft);
  codeLine(code, 'fk.spring(card, {', 18, colors.coral);
  const positionLine = codeLine(code, '  Position: calmPosition,', 48);
  const rotationLine = codeLine(code, '  Rotation: 0,', 78);
  codeLine(code, '  BackgroundColor3: accent,', 108);
  codeLine(code, '});', 138, colors.coral);
  codeLine(code, '', 168);
  const cardMotion = fk.createMotion(card);
  const scaleMotion = fk.createMotion(scale);
  cardMotion.completed.subscribe(() => fk.update(status, { Text: '● SPRING SETTLED' }));
  fk.state.observe(card, mode, (value) => {
    const goals = [
      [fk.udim2FromOffset(48, 110), 0, 1],
      [fk.udim2FromOffset(76, 72), -5, 1.08],
      [fk.udim2FromOffset(28, 188), 7, 0.94],
      [fk.udim2FromOffset(86, 204), 11, 0.86],
    ] as const;
    const goal = goals[value]!;
    fk.update(status, { Text: `● MOVING TO ${labels[value]}`, TextColor3: accents[value]! });
    fk.update(stateLabel, { Text: labels[value]! });
    fk.update(positionLine, { Text: `  Position: ${labels[value]!.toLowerCase()}Position,` });
    fk.update(rotationLine, { Text: `  Rotation: ${goal[1]},` });
    cardMotion.spring({ Position: goal[0], Rotation: goal[1], BackgroundColor3: accents[value]! });
    scaleMotion.spring({ Scale: goal[2] });
  });
  fk.append(content, lab);
  fk.append(section, content);
  return section;
}
