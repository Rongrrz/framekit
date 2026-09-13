import { assertNonNegativeFinite } from '../core/internal/validation';
import { createUIScale, type UIScale } from '../core/modifiers/scale';
import type { GuiElement } from '../core/node-service/gui-node';
import { TweenService } from '../services/tween-service';

/** Adds a UIScale that springs between its resting and hovered values. */
export function bindHoverScale(node: GuiElement, hoveredScale = 1.035): UIScale {
  assertNonNegativeFinite(hoveredScale, 'Hovered scale');
  const scale = createUIScale();
  node.addChild(scale);
  node.onMouseEnter(() => TweenService.spring(scale, { Scale: hoveredScale }));
  node.onMouseLeave(() => TweenService.spring(scale, { Scale: 1 }));
  return scale;
}
