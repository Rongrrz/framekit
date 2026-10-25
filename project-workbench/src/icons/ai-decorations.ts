import { color3ToCss, createUIPadding, udim, type TextButton, type TextLabel } from 'framekit';

import { icons, type IconName } from './ai-icons';

/** CSS masks inherit the control's theme color and never add a second focus target. */
export const setIcon = (
  node: TextButton | TextLabel,
  icon: IconName,
  placement: 'leading' | 'only' = 'leading',
): void => {
  if (!node.unsafeElement.dataset.workbenchIcon) {
    node.onPropertyChanged('TextColor3', (color) =>
      node.unsafeElement.style.setProperty('--workbench-icon-color', color3ToCss(color)),
    );
  }

  node.unsafeElement.dataset.workbenchIcon = placement;
  node.unsafeElement.style.setProperty('--workbench-icon', `url("${icons[icon]}")`);
  node.unsafeElement.style.setProperty('--workbench-icon-color', color3ToCss(node.TextColor3));

  if (placement === 'leading') {
    const padding = node.getChildren().find((child) => child.isA('UIPadding'));

    if (padding?.isA('UIPadding')) {
      padding.PaddingLeft = udim(0, 34);
    } else {
      createUIPadding({ PaddingLeft: udim(0, 34), PaddingRight: udim(0, 10) }).Parent = node;
    }

    node.TextXAlignment = 'Left';
  }
};
