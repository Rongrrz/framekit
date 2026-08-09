import { node, type Node, type NodeProps, type Styles } from '../core/node';
import { Color3 } from '../primitives/Color3';

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
  return node(
    {
      Name: 'UIStroke',
      Enabled: true,
      Color: Color3.fromRGB(0, 0, 0),
      Transparency: 0,
      Thickness: 1,
      BorderStrokePosition: 'Outer',
      ...initial,
    },
    undefined,
    undefined,
    (props): Styles => (props.Enabled ? { 'box-shadow': strokeShadow(props) } : {}),
  );
}

function strokeShadow(props: Readonly<UIStrokeProps>): string {
  const thickness = Math.max(0, props.Thickness);
  const color = props.Color.toCSS(props.Transparency);
  if (props.BorderStrokePosition === 'Inner') return `inset 0 0 0 ${thickness}px ${color}`;
  if (props.BorderStrokePosition === 'Outer') return `0 0 0 ${thickness}px ${color}`;
  const halfThickness = thickness / 2;
  return `inset 0 0 0 ${halfThickness}px ${color}, 0 0 0 ${halfThickness}px ${color}`;
}
