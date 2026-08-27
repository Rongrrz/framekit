import { createStyleModifier, type StyleModifierNode, type Styles } from '../runtime/render';
import { mergeProps, type NodeProps } from '../runtime/state';
import { color3, color3ToCss, type Color3 } from '../values';

export type BorderStrokePosition = 'Inner' | 'Center' | 'Outer';

export type UIStrokeProps = NodeProps & {
  Enabled: boolean;
  Color: Color3;
  Transparency: number;
  Thickness: number;
  BorderStrokePosition: BorderStrokePosition;
};

export type UIStrokeNode = StyleModifierNode<UIStrokeProps>;

/** Creates a stroke modifier that applies a border effect to its GUI parent. */
export function createUIStroke(initial: Partial<UIStrokeProps> = {}): UIStrokeNode {
  return createStyleModifier(
    'UIStroke',
    mergeProps(
      {
        Name: 'UIStroke',
        Enabled: true,
        Color: color3(0, 0, 0),
        Transparency: 0,
        Thickness: 1,
        BorderStrokePosition: 'Outer',
      },
      initial,
    ),
    (props): Styles => (props.Enabled ? { 'box-shadow': resolveStrokeShadow(props) } : {}),
  );
}

function resolveStrokeShadow(props: Readonly<UIStrokeProps>): string {
  const thickness = Math.max(0, props.Thickness);
  const color = color3ToCss(props.Color, props.Transparency);
  if (props.BorderStrokePosition === 'Inner') return `inset 0px 0px 0px ${thickness}px ${color}`;
  if (props.BorderStrokePosition === 'Outer') return `0px 0px 0px ${thickness}px ${color}`;

  const halfThickness = thickness / 2;
  return `inset 0px 0px 0px ${halfThickness}px ${color}, 0px 0px 0px ${halfThickness}px ${color}`;
}
