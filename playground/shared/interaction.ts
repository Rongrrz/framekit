import { fk } from 'framekit';

import { colors } from '../theme';

export function bindButtonMotion(
  node: fk.TextButtonNode,
  idle: fk.Color3,
  hovered: fk.Color3,
): void {
  const scale = fk.createUIScale();
  fk.append(node, scale);

  fk.on(node, 'MouseEnter', () => {
    if (fk.props(node).Disabled) return;
    fk.spring(node, { BackgroundColor3: hovered });
    fk.spring(scale, { Scale: 1.035 });
  });
  fk.on(node, 'MouseLeave', () => {
    fk.spring(node, { BackgroundColor3: idle });
    fk.spring(scale, { Scale: 1 });
  });
}

export function bindCardMotion(node: fk.FrameNode, rotation = -1.25, scaleGoal = 1.025): void {
  const scale = fk.createUIScale();
  fk.append(node, scale);

  fk.on(node, 'MouseEnter', () => {
    fk.spring(scale, { Scale: scaleGoal });
    fk.spring(node, { Rotation: rotation });
  });
  fk.on(node, 'MouseLeave', () => {
    fk.spring(scale, { Scale: 1 });
    fk.spring(node, { Rotation: 0 });
  });
}

export function bindScaleMotion(node: fk.GuiNode, scaleGoal = 1.035): void {
  const scale = fk.createUIScale();
  fk.append(node, scale);
  fk.on(node, 'MouseEnter', () => fk.spring(scale, { Scale: scaleGoal }));
  fk.on(node, 'MouseLeave', () => fk.spring(scale, { Scale: 1 }));
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
