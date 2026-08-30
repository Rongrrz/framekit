import { fk, fka } from 'framekit';

/** Adds retained hover color and scale motion to a playground button. */
export function bindButtonMotion(button: fk.TextButton, idle: fk.Color3, hovered: fk.Color3): void {
  const scale = fk.createUIScale();

  button.addChild(scale);
  button.onMouseEnter(() => {
    if (button.Disabled) return;
    fka.spring(button, { BackgroundColor3: hovered });
    fka.spring(scale, { Scale: 1.035 });
  });
  button.onMouseLeave(() => {
    fka.spring(button, { BackgroundColor3: idle });
    fka.spring(scale, { Scale: 1 });
  });
}
