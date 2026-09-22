import { vector2, type Vector2 } from '#values/vector2.js';

import type { FloatingPanelPlacement } from './types.js';

type AnchorBounds = Readonly<{ left: number; right: number; top: number; bottom: number }>;

const oppositeSide = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const;
const viewportMargin = 8;

export const panelPosition = (
  anchor: AnchorBounds,
  size: Readonly<{ width: number; height: number }>,
  preferredSide: FloatingPanelPlacement,
  gap: number,
  viewportWidth: number,
  viewportHeight: number,
): Vector2 => {
  const space = {
    top: anchor.top - viewportMargin,
    bottom: viewportHeight - anchor.bottom - viewportMargin,
    left: anchor.left - viewportMargin,
    right: viewportWidth - anchor.right - viewportMargin,
  };
  const needed =
    (preferredSide === 'top' || preferredSide === 'bottom' ? size.height : size.width) + gap;
  const opposite = oppositeSide[preferredSide];
  const side =
    space[preferredSide] < needed && space[opposite] > space[preferredSide]
      ? opposite
      : preferredSide;
  const x =
    side === 'left'
      ? anchor.left - size.width - gap
      : side === 'right'
        ? anchor.right + gap
        : (anchor.left + anchor.right - size.width) / 2;
  const y =
    side === 'top'
      ? anchor.top - size.height - gap
      : side === 'bottom'
        ? anchor.bottom + gap
        : (anchor.top + anchor.bottom - size.height) / 2;
  return vector2(
    Math.max(viewportMargin, Math.min(x, viewportWidth - size.width - viewportMargin)),
    Math.max(viewportMargin, Math.min(y, viewportHeight - size.height - viewportMargin)),
  );
};
