import { createStyleModifier, type StyleModifierNode, type Styles } from '../runtime/render';
import { mergeProps, type NodeProps } from '../runtime/state';
import { udim, udimToCss, type UDim } from '../values/udim';

export type UIPaddingProps = NodeProps & {
  PaddingTop: UDim;
  PaddingRight: UDim;
  PaddingBottom: UDim;
  PaddingLeft: UDim;
};

export type UIPaddingNode = StyleModifierNode<UIPaddingProps>;

/** Creates padding inside its GUI parent. */
export function createUIPadding(initial: Partial<UIPaddingProps> = {}): UIPaddingNode {
  return createStyleModifier(
    'UIPadding',
    mergeProps(
      {
        Name: 'UIPadding',
        PaddingTop: udim(0, 0),
        PaddingRight: udim(0, 0),
        PaddingBottom: udim(0, 0),
        PaddingLeft: udim(0, 0),
      },
      initial,
    ),
    resolvePadding,
  );
}

function resolvePadding(props: Readonly<UIPaddingProps>): Styles {
  return {
    'padding-top': udimToCss(props.PaddingTop),
    'padding-right': udimToCss(props.PaddingRight),
    'padding-bottom': udimToCss(props.PaddingBottom),
    'padding-left': udimToCss(props.PaddingLeft),
  };
}
