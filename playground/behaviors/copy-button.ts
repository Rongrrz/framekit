import { fk } from 'framekit';

import { colors } from '../theme';

const feedbackTimers = new WeakMap<
  fk.TextButtonNode,
  Readonly<{
    timer: number;
    unregisterCleanup: () => void;
  }>
>();

/** Copies a command and temporarily reports the result through the source button. */
export async function copyCommand(
  button: fk.TextButtonNode,
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

  if (button.isDestroyed()) return;

  button.setProperties(
    copied
      ? {
          Text: 'COPIED  ✓',
          BackgroundColor3: colors.mint,
          TextColor3: colors.ink,
        }
      : { Text: command },
  );

  const previousFeedback = feedbackTimers.get(button);
  if (previousFeedback) {
    window.clearTimeout(previousFeedback.timer);
    previousFeedback.unregisterCleanup();
  }

  let unregisterCleanup = (): void => {};
  const timer = window.setTimeout(() => {
    feedbackTimers.delete(button);
    unregisterCleanup();
    if (button.isDestroyed()) return;

    button.setProperties({
      Text: idleLabel,
      BackgroundColor3: idleBackground,
      TextColor3: idleForeground,
    });
  }, 1600);

  unregisterCleanup = button.onDestroy(() => {
    window.clearTimeout(timer);
    feedbackTimers.delete(button);
  });
  feedbackTimers.set(button, { timer, unregisterCleanup });
}
