import { decoratorNode, type DecoratorStyles, type Node, type NodeProps } from '../core/node';
import { color3, color3ToCss, type Color3 } from '../primitives/color3';

export type BorderStrokePosition = 'Inner' | 'Center' | 'Outer';

export type UIStrokeProps = NodeProps & {
  Enabled: boolean;
  Color: Color3;
  Transparency: number;
  Thickness: number;
  BorderStrokePosition: BorderStrokePosition;
};

export type UIStrokeNode = Node<UIStrokeProps>;

export function uiStrokeNode(initial: Partial<UIStrokeProps> = {}): UIStrokeNode {
  return decoratorNode(
    {
      Name: 'UIStroke',
      Enabled: true,
      Color: color3(0, 0, 0),
      Transparency: 0,
      Thickness: 1,
      BorderStrokePosition: 'Outer',
      ...initial,
    },
    (props): DecoratorStyles => (props.Enabled ? { 'box-shadow': strokeShadow(props) } : {}),
  );
}

function strokeShadow(props: Readonly<UIStrokeProps>): string {
  const thickness = Math.max(0, props.Thickness);
  const color = color3ToCss(props.Color, props.Transparency);
  if (props.BorderStrokePosition === 'Inner') return `inset 0 0 0 ${thickness}px ${color}`;
  if (props.BorderStrokePosition === 'Outer') return `0 0 0 ${thickness}px ${color}`;
  const halfThickness = thickness / 2;
  return `inset 0 0 0 ${halfThickness}px ${color}, 0 0 0 ${halfThickness}px ${color}`;
}
