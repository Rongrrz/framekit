import { fk } from 'framekit';

import type { Category, CategoryId } from '../data/categories';
import { palette } from '../shared/theme';
import { selectedCategory } from '../state/catalog';

const categoryListContentWidth = 1018;

export function createCategoryButton(category: Category): fk.TextButtonNode {
  let active = false;
  const button = fk.createTextButton({
    Name: category.id,
    Size: fk.udim2FromScale(194 / categoryListContentWidth, 1),
    BackgroundColor3: palette.raised,
    BackgroundTransparency: 0.45,
    Text: category.label,
    TextColor3: palette.muted,
    TextSize: 11,
    FontWeight: 650,
    TextXAlignment: 'Center',
  });
  fk.append(button, fk.createUICorner({ CornerRadius: 10 }));
  const motion = fk.createMotion(button, { tension: 240, friction: 24 });

  function renderActive(nextActive: boolean): void {
    active = nextActive;
    fk.update(button, { FontWeight: active ? 800 : 650 });
    motion.spring({
      BackgroundColor3: active ? palette.coral : palette.raised,
      BackgroundTransparency: active ? 0.78 : 0.45,
      TextColor3: active ? palette.coral : palette.muted,
    });
  }

  function showHover(): void {
    if (!active) {
      motion.spring({
        BackgroundColor3: fk.color3(238, 228, 221),
        BackgroundTransparency: 0.18,
      });
    }
  }

  function restoreAppearance(): void {
    renderActive(active);
  }

  function selectCategory(): void {
    selectedCategory(category.id);
  }

  function renderSelection(selectedId: CategoryId): void {
    renderActive(category.id === selectedId);
  }

  fk.on(button, 'MouseEnter', showHover);
  fk.on(button, 'MouseLeave', restoreAppearance);
  fk.on(button, 'MouseButton1Click', selectCategory);
  fk.state.observe(button, selectedCategory, renderSelection);
  return button;
}
