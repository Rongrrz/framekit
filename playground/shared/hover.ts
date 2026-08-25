import { fk } from 'framekit';

/** Applies a softly animated two-color hover state to a button. */
export function bindHover(button: fk.TextButtonNode, idle: fk.Color3, hover: fk.Color3): void {
  const motion = fk.createMotion(button, { tension: 260, friction: 24 });

  function animateTo(color: fk.Color3): void {
    motion.spring({ BackgroundColor3: color });
  }

  function showHover(): void {
    if (fk.props(button).Disabled) return;
    animateTo(hover);
  }

  function showIdle(): void {
    animateTo(idle);
  }

  fk.on(button, 'MouseEnter', showHover);
  fk.on(button, 'MouseLeave', showIdle);
}
