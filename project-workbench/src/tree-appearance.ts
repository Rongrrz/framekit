import { createUIPadding, udim, type TextButton, type TextLabel } from 'framekit';

const paths = {
  frame: 'M3 3h18v18H3z M3 8h18 M8 8v13',
  text: 'M4 5h16 M12 5v15 M8 20h8',
  button: 'M3 5h18v14H3z M8 12h8',
  input: 'M3 5h18v14H3z M9 8v8 M7 8h4 M7 16h4',
  image: 'M3 3h18v18H3z M3 16l6-6 5 5 3-3 4 4 M15 7h.01',
  modifier: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
  prefab: 'M12 2l10 6v8l-10 6L2 16V8z M2 8l10 6 10-6 M12 14v8',
  folder: 'M2 6h8l2 3h10v12H2z',
  file: 'M5 2h9l5 5v15H5z M14 2v6h5 M8 13h8 M8 17h6',
  script: 'M8 6l-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18',
} as const;

/** Decorations use pseudo-elements so FrameKit continues to own the row and its text. */
export const decorateTreeRow = (
  row: TextButton | TextLabel,
  depth: number,
  icon: keyof typeof paths,
  expanded?: boolean,
): void => {
  const element = row.unsafeElement;
  element.dataset.treeRow = '';
  element.style.setProperty('--tree-indent', `${8 + (depth - 1) * 14}px`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${paths[icon]}" fill="none" stroke="black" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  element.style.setProperty('--tree-icon', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);

  if (expanded === undefined) {
    delete element.dataset.treeExpanded;
  } else {
    element.dataset.treeExpanded = String(expanded);
  }

  const padding = row.getChildren().find((child) => child.isA('UIPadding'));

  if (padding?.isA('UIPadding')) {
    padding.PaddingLeft = udim(0, 54 + (depth - 1) * 14);
  } else {
    createUIPadding({ PaddingLeft: udim(0, 54 + (depth - 1) * 14) }).Parent = row;
  }
};
