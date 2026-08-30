import { spring } from '../animation/spring';
import { createUIScale, type UIScale } from '../core/modifiers/scale';
import type { GuiElement } from '../shared/runtime/render';
import { assertNonNegativeFinite } from '../shared/runtime/validation';

/** Adds a UIScale that springs between its resting and hovered values. */
export function bindHoverScale(node: GuiElement, hoveredScale = 1.035): UIScale {
  assertNonNegativeFinite(hoveredScale, 'Hovered scale');
  const scale = createUIScale();
  node.addChild(scale);
  node.onMouseEnter(() => spring(scale, { Scale: hoveredScale }));
  node.onMouseLeave(() => spring(scale, { Scale: 1 }));
  return scale;
}
