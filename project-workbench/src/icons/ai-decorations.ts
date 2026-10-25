import { createUIPadding, udim, type TextLabel } from 'framekit';

import { icons, type IconName } from './ai-icons';

/** CSS masks inherit the control's theme color and never add a second focus target. */
export const setIcon = (
  node: TextLabel,
  icon: IconName,
  placement: 'leading' | 'only' = 'leading',
): void => {
  const paint = (): void => {
    const { R, G, B } = node.TextColor3;
    node.unsafeElement.style.setProperty(
      '--workbench-icon-color',
      `rgb(${Math.round(R * 255)}, ${Math.round(G * 255)}, ${Math.round(B * 255)})`,
    );
  };

  if (!node.unsafeElement.dataset.workbenchIcon) {
    node.onPropertyChanged('TextColor3', paint);
  }

  node.unsafeElement.dataset.workbenchIcon = placement;
  node.unsafeElement.style.setProperty('--workbench-icon', `url("${icons[icon]}")`);
  paint();

  const padding = node.getChildren().find((child) => child.isA('UIPadding'));

  if (padding?.isA('UIPadding')) {
    padding.PaddingLeft = udim(0, placement === 'leading' ? 34 : 0);
    padding.PaddingRight = udim(0, placement === 'leading' ? 10 : 0);
  } else if (placement === 'leading') {
    createUIPadding({ PaddingLeft: udim(0, 34), PaddingRight: udim(0, 10) }).Parent = node;
  }

  if (placement === 'leading') {
    node.TextXAlignment = 'Left';
  }
};
