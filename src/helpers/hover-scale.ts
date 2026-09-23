import { spring } from '#animation/spring/spring.js';
import type { GuiElement } from '#internal/runtime/node/gui-node.js';
import { assertNonNegativeFinite } from '#internal/validation.js';
import type { UIScale } from '#modifiers/scale.js';
import type { Unsubscribe } from '#state/signal.js';

/** Controls an attached scale until disposed or the node is destroyed. The caller owns the scale. */
export function bindHoverScale(
  node: GuiElement,
  scale: UIScale,
  hoveredScale = 1.035,
): Unsubscribe {
  assertNonNegativeFinite(hoveredScale, 'Hovered scale');
  if (scale.Parent !== node) {
    throw new Error('Hover scale must be attached to its event node.');
  }
  const unsubscribeEnter = node.onMouseEnter(() => spring(scale, { Scale: hoveredScale }));
  const unsubscribeLeave = node.onMouseLeave(() => spring(scale, { Scale: 1 }));
  const unregisterDestroy = node.onDestroy(dispose);
  let active = true;

  function dispose(): void {
    if (!active) {
      return;
    }
    active = false;
    unsubscribeEnter();
    unsubscribeLeave();
    unregisterDestroy();
    if (!scale.isDestroyed()) {
      spring(scale).stop('Scale');
    }
  }

  return dispose;
}
