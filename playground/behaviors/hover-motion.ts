import { fk, fka } from 'framekit';

/** Adds retained hover color and scale motion to a playground button. */
export function bindButtonMotion(node: fk.TextButton, idle: fk.Color3, hovered: fk.Color3): void {
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

/** Adds retained hover rotation and scale motion to a playground card. */
export function bindCardMotion(node: fk.Frame, rotation = -1.25, scaleGoal = 1.025): void {
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
