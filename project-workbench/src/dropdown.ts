import {
  bindMenu,
  createUIPadding,
  udim,
  udim2FromOffset,
  type GuiElement,
  type TextButton,
} from 'framekit';

import { button, colors, panel, round } from './ui';

/** One selected value, native popover dismissal, and the same keyboard navigation as other menus. */
export const createDropdown = <T extends string | number>(
  parent: GuiElement,
  options: Readonly<{
    label: string;
    choices: readonly Readonly<{ value: T; label: string | (() => string) }>[];
    value(): T;
    change(value: T): void;
    width?: number;
    menuParent?: GuiElement;
  }>,
): Readonly<{ control: TextButton; refresh(): void }> => {
  const control = button(parent, '', () => {}, options.width ?? 160);
  control.AccessibleLabel = options.label;
  control.TextXAlignment = 'Left';
  control.unsafeElement.dataset.workbenchDropdown = '';
  createUIPadding({ PaddingLeft: udim(0, 12), PaddingRight: udim(0, 30) }).Parent = control;
  const menu = panel(`${options.label} options`, options.menuParent ?? parent);
  round(menu, 8, true);
  const text = (choice: (typeof options.choices)[number]): string =>
    typeof choice.label === 'function' ? choice.label() : choice.label;
  const items = options.choices.map((choice, index) => {
    const item = button(menu, '', () => {
      options.change(choice.value);
      refresh();
    });
    item.Position = udim2FromOffset(6, 6 + index * 36);
    item.TextXAlignment = 'Left';
    item.TextSize = 12;
    item.BackgroundTransparency = 1;
    return item;
  });
  const refresh = (): void => {
    const selected = options.choices.find((choice) => choice.value === options.value());
    control.Text = selected ? text(selected) : String(options.value());
    control.unsafeElement.setAttribute('aria-description', control.Text);
    control.unsafeElement.title = `${options.label}: ${control.Text}`;
    const width = Math.min(Math.max(options.width ?? 160, 260), window.innerWidth - 24);
    menu.Size = udim2FromOffset(width, options.choices.length * 36 + 12);

    items.forEach((item, index) => {
      const choice = options.choices[index]!;
      const current = choice.value === options.value();
      item.Text = `${current ? '✓' : '  '}  ${text(choice)}`;
      item.AccessibleLabel = text(choice);
      item.Size = udim2FromOffset(width - 12, 32);
      item.TextColor3 = current ? colors.accent : colors.text;
      item.unsafeElement.setAttribute('aria-current', String(current));
    });
  };
  control.on('click', refresh, { capture: true });
  control.on('keydown', refresh, { capture: true });
  bindMenu(control, menu, items);
  control.onDestroy(() => menu.destroy());
  refresh();
  return { control, refresh };
};
