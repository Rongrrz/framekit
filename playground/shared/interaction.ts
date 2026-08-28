import { fk } from 'framekit';

import { colors } from '../theme';

const copyFeedbackTimers = new WeakMap<
  fk.TextButtonNode,
  Readonly<{ timer: number; unregisterCleanup: () => void }>
>();

export function bindButtonMotion(
  node: fk.TextButtonNode,
  idle: fk.Color3,
  hovered: fk.Color3,
): void {
  const scale = fk.createUIScale();
  fk.append(node, scale);

  node.onMouseEnter(() => {
    if (fk.props(node).Disabled) return;
    fk.spring(node, { BackgroundColor3: hovered });
    fk.spring(scale, { Scale: 1.035 });
  });
  node.onMouseLeave(() => {
    fk.spring(node, { BackgroundColor3: idle });
    fk.spring(scale, { Scale: 1 });
  });
}

export function bindCardMotion(node: fk.FrameNode, rotation = -1.25, scaleGoal = 1.025): void {
  const scale = fk.createUIScale();
  fk.append(node, scale);

  node.onMouseEnter(() => {
    fk.spring(scale, { Scale: scaleGoal });
    fk.spring(node, { Rotation: rotation });
  });
  node.onMouseLeave(() => {
    fk.spring(scale, { Scale: 1 });
    fk.spring(node, { Rotation: 0 });
  });
}

export function bindScaleMotion(node: fk.GuiNode, scaleGoal = 1.035): void {
  const scale = fk.createUIScale();
  fk.append(node, scale);
  node.onMouseEnter(() => fk.spring(scale, { Scale: scaleGoal }));
  node.onMouseLeave(() => fk.spring(scale, { Scale: 1 }));
}

export async function copyCommand(
  node: fk.TextButtonNode,
  command: string,
  idleLabel: string,
  idleBackground = colors.inkRaised,
  idleForeground = colors.text,
): Promise<void> {
  let copied = true;
  try {
    await navigator.clipboard.writeText(command);
  } catch {
    copied = false;
  }
  if (fk.isDestroyed(node)) return;
  if (copied) {
    fk.update(node, { Text: 'COPIED  ✓', BackgroundColor3: colors.mint, TextColor3: colors.ink });
  } else {
    fk.update(node, { Text: command });
  }
  const previousTimer = copyFeedbackTimers.get(node);
  if (previousTimer) {
    window.clearTimeout(previousTimer.timer);
    previousTimer.unregisterCleanup();
  }

  let unregisterCleanup = (): void => {};
  const timer = window.setTimeout(() => {
    copyFeedbackTimers.delete(node);
    unregisterCleanup();
    if (fk.isDestroyed(node)) return;
    fk.update(node, {
      Text: idleLabel,
      BackgroundColor3: idleBackground,
      TextColor3: idleForeground,
    });
  }, 1600);
  unregisterCleanup = fk.onDestroy(node, () => {
    window.clearTimeout(timer);
    copyFeedbackTimers.delete(node);
  });
  copyFeedbackTimers.set(node, { timer, unregisterCleanup });
}
