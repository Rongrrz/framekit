import { spring } from '../animation';
import { createUIScale, type UIScaleNode } from '../core/modifiers';
import type { GuiNode } from '../shared/runtime/render';
import { assertNonNegativeFinite } from '../shared/runtime/validation';

/** Adds a UIScale that springs between its resting and hovered values. */
export function bindHoverScale(node: GuiNode, hoveredScale = 1.035): UIScaleNode {
  assertNonNegativeFinite(hoveredScale, 'Hovered scale');
  const scale = createUIScale();
  node.addChild(scale);
  node.onMouseEnter(() => spring(scale, { Scale: hoveredScale }));
  node.onMouseLeave(() => spring(scale, { Scale: 1 }));
  return scale;
}
