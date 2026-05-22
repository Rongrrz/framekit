import { Enum } from '../enums';
import { Color4 } from '../primitives/Color4';
import { colorToCss } from '../rendering/toCss';
import type { BorderStrokePosition, LineJoinMode } from '../types';
import { createUIDecorator, isTextHost, type UIDecorator } from './decorator';

// TODO: Extract text (ApplyStrokeMode) mode into UITextStroke...
type UIStrokeProps = {
  ApplyStrokeMode?: 'Border' | 'Contextual';
  Enabled?: boolean;
  Color?: Color4;
  Thickness?: number;
  LineJoinMode?: LineJoinMode;
  BorderStrokePosition?: BorderStrokePosition;
};

export const UIStroke: UIDecorator<UIStrokeProps> = createUIDecorator((props, hostType) => {
  if (props.Enabled === false) {
    return {};
  }

  const color4 = props.Color ?? Color4.rgbt(0, 0, 0, 0);
  const color = colorToCss(color4);
  const thickness = props.Thickness ?? 1;
  const applyStrokeMode = props.ApplyStrokeMode ?? 'Border';

  const shouldUseTextStroke = isTextHost(hostType) && applyStrokeMode === 'Contextual';
  return shouldUseTextStroke
    ? {
        WebkitTextStrokeColor: color,
        WebkitTextStrokeWidth: thickness,
      }
    : strokeToCss(props.BorderStrokePosition ?? Enum.BorderStrokePosition.Outer, thickness, color);
});

function strokeToCss(
  position: BorderStrokePosition,
  thickness: number,
  color: string,
): Pick<React.CSSProperties, 'boxShadow'> {
  switch (position) {
    case 'Inner':
      return {
        boxShadow: `inset 0 0 0 ${thickness}px ${color}`,
      };

    case 'Outer':
      return {
        boxShadow: `0 0 0 ${thickness}px ${color}`,
      };

    case 'Center': {
      const halfThickness = thickness / 2;
      return {
        boxShadow: [
          `inset 0 0 0 ${halfThickness}px ${color}`,
          `0 0 0 ${halfThickness}px ${color}`,
        ].join(', '),
      };
    }
  }
}
