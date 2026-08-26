import { fk } from 'framekit';

import { colors } from '../theme';

export function bindButtonMotion(
  node: fk.TextButtonNode,
  idle: fk.Color3,
  hovered: fk.Color3,
): void {
  const colorMotion = fk.createMotion(node, { tension: 260, friction: 24 });
  const scale = fk.createUIScale();
  const scaleMotion = fk.createMotion(scale, { tension: 300, friction: 22 });
  fk.append(node, scale);

  fk.on(node, 'MouseEnter', () => {
    if (fk.props(node).Disabled) return;
    colorMotion.spring({ BackgroundColor3: hovered });
    scaleMotion.spring({ Scale: 1.035 });
  });
  fk.on(node, 'MouseLeave', () => {
    colorMotion.spring({ BackgroundColor3: idle });
    scaleMotion.spring({ Scale: 1 });
  });
}

export function bindCardMotion(node: fk.FrameNode, rotation = -1.25, scaleGoal = 1.025): void {
  const scale = fk.createUIScale();
  const scaleMotion = fk.createMotion(scale, { tension: 280, friction: 22 });
  const cardMotion = fk.createMotion(node, { tension: 250, friction: 23 });
  fk.append(node, scale);

  fk.on(node, 'MouseEnter', () => {
    scaleMotion.spring({ Scale: scaleGoal });
    cardMotion.spring({ Rotation: rotation });
  });
  fk.on(node, 'MouseLeave', () => {
    scaleMotion.spring({ Scale: 1 });
    cardMotion.spring({ Rotation: 0 });
  });
}

export function bindScaleMotion(node: fk.GuiNode, scaleGoal = 1.035): void {
  const scale = fk.createUIScale();
  const motion = fk.createMotion(scale, { tension: 300, friction: 22 });
  fk.append(node, scale);
  fk.on(node, 'MouseEnter', () => motion.spring({ Scale: scaleGoal }));
  fk.on(node, 'MouseLeave', () => motion.spring({ Scale: 1 }));
}

export async function copyCommand(
  node: fk.TextButtonNode,
  command: string,
  idleLabel: string,
  idleBackground = colors.inkRaised,
  idleForeground = colors.text,
): Promise<void> {
  try {
    await navigator.clipboard.writeText(command);
    fk.update(node, { Text: 'COPIED  ✓', BackgroundColor3: colors.mint, TextColor3: colors.ink });
  } catch {
    fk.update(node, { Text: command });
  }
  window.setTimeout(() => {
    if (fk.isDestroyed(node)) return;
    fk.update(node, {
      Text: idleLabel,
      BackgroundColor3: idleBackground,
      TextColor3: idleForeground,
    });
  }, 1600);
}
