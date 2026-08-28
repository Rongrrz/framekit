import { fk, fka } from 'framekit';

import { colors } from '../theme';

const copyFeedbackTimers = new WeakMap<
  fk.TextButtonNode,
  Readonly<{
    timer: number;
    unregisterCleanup: () => void;
  }>
>();

export function bindButtonMotion(
  node: fk.TextButtonNode,
  idle: fk.Color3,
  hovered: fk.Color3,
): void {
  const scale = fk.createUIScale();

  node.addChild(scale);
  node.onMouseEnter(() => {
    if (node.Disabled) return;
    fka.spring(node, { BackgroundColor3: hovered });
    fka.spring(scale, { Scale: 1.035 });
  });
  node.onMouseLeave(() => {
    fka.spring(node, { BackgroundColor3: idle });
    fka.spring(scale, { Scale: 1 });
  });
}

export function bindCardMotion(node: fk.FrameNode, rotation = -1.25, scaleGoal = 1.025): void {
  const scale = fk.createUIScale();

  node.addChild(scale);
  node.onMouseEnter(() => {
    fka.spring(scale, { Scale: scaleGoal });
    fka.spring(node, { Rotation: rotation });
  });
  node.onMouseLeave(() => {
    fka.spring(scale, { Scale: 1 });
    fka.spring(node, { Rotation: 0 });
  });
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
  if (node.isDestroyed()) return;
  if (copied) {
    node.setProperties({
      Text: 'COPIED  ✓',
      BackgroundColor3: colors.mint,
      TextColor3: colors.ink,
    });
  } else {
    node.setProperties({ Text: command });
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
    if (node.isDestroyed()) return;
    node.setProperties({
      Text: idleLabel,
      BackgroundColor3: idleBackground,
      TextColor3: idleForeground,
    });
  }, 1600);
  unregisterCleanup = node.onDestroy(() => {
    window.clearTimeout(timer);
    copyFeedbackTimers.delete(node);
  });
  copyFeedbackTimers.set(node, { timer, unregisterCleanup });
}
