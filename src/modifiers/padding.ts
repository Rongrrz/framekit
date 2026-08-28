import { createStyleModifier, type StyleModifierNode, type Styles } from '../runtime/modifier';
import { mergeProperties, type NodeProperties } from '../runtime/node-state';
import { udim, udimToCss, type UDim } from '../values/udim';

/** Inner padding applied independently on each edge. */
export type UIPaddingProperties = NodeProperties & {
  /** Inner spacing on the top edge. */
  PaddingTop: UDim;
  /** Inner spacing on the right edge. */
  PaddingRight: UDim;
  /** Inner spacing on the bottom edge. */
  PaddingBottom: UDim;
  /** Inner spacing on the left edge. */
  PaddingLeft: UDim;
};

/** An element-less inner-padding modifier. */
export type UIPaddingNode = StyleModifierNode<UIPaddingProperties>;

/** Creates padding inside its GUI parent. */
export function createUIPadding(initial: Partial<UIPaddingProperties> = {}): UIPaddingNode {
  return createStyleModifier(
    'UIPadding',
    mergeProperties(
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

function resolvePadding(properties: Readonly<UIPaddingProperties>): Styles {
  return {
    'padding-top': udimToCss(properties.PaddingTop),
    'padding-right': udimToCss(properties.PaddingRight),
    'padding-bottom': udimToCss(properties.PaddingBottom),
    'padding-left': udimToCss(properties.PaddingLeft),
  };
}
