import { createUIScale, type UIScale } from '../core/modifiers/scale';
import type { GuiElement } from '../node/gui-node';
import { assertNonNegativeFinite } from '../runtime/validation';
import { SpringService } from '../services/spring-service';

/** Adds a UIScale that springs between its resting and hovered values. */
export function bindHoverScale(node: GuiElement, hoveredScale = 1.035): UIScale {
  assertNonNegativeFinite(hoveredScale, 'Hovered scale');
  const scale = createUIScale();
  node.addChild(scale);
  node.onMouseEnter(() => SpringService.animate(scale, { Scale: hoveredScale }));
  node.onMouseLeave(() => SpringService.animate(scale, { Scale: 1 }));
  return scale;
}
