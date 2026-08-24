import { fk } from 'framekit';

/** Applies a simple two-color hover state to a button. */
export function bindHover(button: fk.TextButtonNode, idle: fk.Color3, hover: fk.Color3): void {
  function showHover(): void {
    fk.update(button, { BackgroundColor3: hover });
  }

  function showIdle(): void {
    fk.update(button, { BackgroundColor3: idle });
  }

  fk.on(button, 'MouseEnter', showHover);
  fk.on(button, 'MouseLeave', showIdle);
}
