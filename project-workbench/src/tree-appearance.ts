import { createUIPadding, udim, type TextButton, type TextLabel } from 'framekit';

import { icons, type IconName } from './icons/ai-icons';

/** Decorations use pseudo-elements so FrameKit continues to own the row and its text. */
export const decorateTreeRow = (
  row: TextButton | TextLabel,
  depth: number,
  icon: IconName,
  expanded?: boolean,
): void => {
  const element = row.unsafeElement;
  element.dataset.treeRow = '';
  element.style.setProperty('--tree-indent', `${8 + (depth - 1) * 14}px`);
  element.style.setProperty('--tree-icon', `url("${icons[icon]}")`);

  if (expanded === undefined) {
    delete element.dataset.treeExpanded;
  } else {
    element.dataset.treeExpanded = String(expanded);
    element.style.setProperty(
      '--tree-chevron',
      `url("${expanded ? icons.chevron_down : icons.chevron_right}")`,
    );
  }

  const padding = row.getChildren().find((child) => child.isA('UIPadding'));

  if (padding?.isA('UIPadding')) {
    padding.PaddingLeft = udim(0, 54 + (depth - 1) * 14);
  } else {
    createUIPadding({ PaddingLeft: udim(0, 54 + (depth - 1) * 14) }).Parent = row;
  }
};
