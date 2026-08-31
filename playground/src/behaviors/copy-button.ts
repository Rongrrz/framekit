import { fk } from 'framekit';

const feedbackTimers = new WeakMap<
  fk.TextButton,
  Readonly<{ timer: number; unregisterCleanup: () => void }>
>();

/** Copies text and reports the result without taking ownership of the button's theme colors. */
export const copyCommand = async (
  button: fk.TextButton,
  command: string,
  idleLabel: string,
): Promise<void> => {
  let copied = true;
  try {
    await navigator.clipboard.writeText(command);
  } catch {
    copied = false;
  }
  if (button.isDestroyed()) return;

  button.Text = copied ? 'COPIED  ✅' : command;
  const previousFeedback = feedbackTimers.get(button);
  if (previousFeedback) {
    window.clearTimeout(previousFeedback.timer);
    previousFeedback.unregisterCleanup();
  }

  let unregisterCleanup = (): void => {};
  const timer = window.setTimeout(() => {
    feedbackTimers.delete(button);
    unregisterCleanup();
    if (!button.isDestroyed()) button.Text = idleLabel;
  }, 1600);
  unregisterCleanup = button.onDestroy(() => {
    window.clearTimeout(timer);
    feedbackTimers.delete(button);
  });
  feedbackTimers.set(button, { timer, unregisterCleanup });
};
