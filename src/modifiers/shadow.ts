import { createStyleModifier, type StyleModifierNode, type Styles } from '../runtime/render';
import { mergeProps, type NodeProps } from '../runtime/state';
import { color3, color3ToCss, type Color3 } from '../values/color3';
import { vector2, type Vector2 } from '../values/vector2';

export type UIShadowProps = NodeProps & {
  Enabled: boolean;
  Color: Color3;
  Transparency: number;
  Offset: Vector2;
  BlurRadius: number;
  SpreadRadius: number;
  Inset: boolean;
};

export type UIShadowNode = StyleModifierNode<UIShadowProps>;

/** Creates a drop-shadow modifier that composes with strokes and glows. */
export function createUIShadow(initial: Partial<UIShadowProps> = {}): UIShadowNode {
  return createStyleModifier(
    'UIShadow',
    mergeProps(
      {
        Name: 'UIShadow',
        Enabled: true,
        Color: color3(0, 0, 0),
        Transparency: 0.5,
        Offset: vector2(0, 8),
        BlurRadius: 16,
        SpreadRadius: 0,
        Inset: false,
      },
      initial,
    ),
    (props): Styles => (props.Enabled ? { 'box-shadow': resolveShadow(props) } : {}),
  );
}

function resolveShadow(props: Readonly<UIShadowProps>): string {
  const blur = nonNegativeFinite(props.BlurRadius, 'BlurRadius');
  const spread = finite(props.SpreadRadius, 'SpreadRadius');
  const inset = props.Inset ? 'inset ' : '';
  return `${inset}${props.Offset.X}px ${props.Offset.Y}px ${blur}px ${spread}px ${color3ToCss(props.Color, props.Transparency)}`;
}

function nonNegativeFinite(value: number, property: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${property} must be a non-negative finite number.`);
  }
  return value;
}

function finite(value: number, property: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${property} must be a finite number.`);
  return value;
}
