import {
  createStyleModifier,
  type StyleModifier,
  type Styles,
} from '../../shared/runtime/modifier';
import type { InstanceProperties } from '../../shared/runtime/node';
import { mergeProperties } from '../../shared/runtime/node-state';
import { assertUDim, udim, udimToCss, type UDim } from '../values/udim';

/** Inner padding applied independently on each edge. */
export type UIPaddingProperties = InstanceProperties & {
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
export type UIPadding = StyleModifier<UIPaddingProperties>;

/** Creates padding inside its GUI parent. */
export function createUIPadding(initial: Partial<UIPaddingProperties> = {}): UIPadding {
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
    validatePaddingProperties,
  );
}

function validatePaddingProperties(properties: Readonly<UIPaddingProperties>): void {
  assertUDim(properties.PaddingTop, 'PaddingTop');
  assertUDim(properties.PaddingRight, 'PaddingRight');
  assertUDim(properties.PaddingBottom, 'PaddingBottom');
  assertUDim(properties.PaddingLeft, 'PaddingLeft');
}

function resolvePadding(properties: Readonly<UIPaddingProperties>): Styles {
  return {
    'padding-top': udimToCss(properties.PaddingTop),
    'padding-right': udimToCss(properties.PaddingRight),
    'padding-bottom': udimToCss(properties.PaddingBottom),
    'padding-left': udimToCss(properties.PaddingLeft),
  };
}
