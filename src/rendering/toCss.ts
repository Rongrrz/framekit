import type { Color4 } from '../primitives/Color4';
import type { UDim } from '../primitives/UDim';
import type { UDim2 } from '../primitives/UDim2';
import type { Vector2 } from '../primitives/Vector2';

function udimToCss(udim: UDim): string {
  return `calc(${udim.Scale * 100}% + ${udim.Offset}px)`;
}

// Notes: position height may be flipped
export function positionToCss(udim2: UDim2, anchorPoint: Vector2): React.CSSProperties {
  return {
    left: udimToCss(udim2.X),
    top: udimToCss(udim2.Y),
    transform: `translate(-${anchorPoint.X * 100}%, -${anchorPoint.Y * 100}%)`,
  };
}

export function sizeToCss(udim2: UDim2): React.CSSProperties {
  return {
    width: udimToCss(udim2.X),
    height: udimToCss(udim2.Y),
  };
}

export function colorToCss(color4: Color4): string {
  return `rgba(${color4.red}, ${color4.green}, ${color4.blue}, ${color4.alpha})`;
}
