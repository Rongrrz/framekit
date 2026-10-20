import type { InstanceProperties } from '#internal/runtime/node/instance.js';
import {
  createStyleModifier,
  type StyleModifier,
  type Styles,
} from '#internal/runtime/node/modifier.js';
import { mergeProperties } from '#internal/runtime/systems/properties.js';
import { assertNonNegativeFinite } from '#internal/validation.js';
import { assertVector2, vector2, type Vector2 } from '#values/vector2.js';

/** Bounds the rendered size while retaining the GUI object's preferred Size. */
export type UISizeConstraintProperties = InstanceProperties & {
  /** Smallest rendered width and height in pixels. */
  MinSize: Vector2;
  /** Largest rendered width and height in pixels. Defaults to Number.MAX_SAFE_INTEGER per axis. */
  MaxSize: Vector2;
};

/** An element-less size constraint that composes with automatic sizing and layouts. */
export type UISizeConstraint = StyleModifier<UISizeConstraintProperties>;

/** Clamps rendered size without changing Size or measuring geometry in JavaScript. */
export function createUISizeConstraint(
  initialProperties: Partial<UISizeConstraintProperties> = {},
): UISizeConstraint {
  return createStyleModifier(
    'UISizeConstraint',
    mergeProperties(
      {
        Name: 'UISizeConstraint',
        MinSize: vector2(0, 0),
        MaxSize: vector2(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
      },
      initialProperties,
    ),
    resolveSizeConstraint,
    validateSizeConstraint,
  );
}

function resolveSizeConstraint(properties: Readonly<UISizeConstraintProperties>): Styles {
  return {
    'min-width': `${properties.MinSize.X}px`,
    'min-height': `${properties.MinSize.Y}px`,
    'max-width': `${properties.MaxSize.X}px`,
    'max-height': `${properties.MaxSize.Y}px`,
  };
}

function validateSizeConstraint(properties: Readonly<UISizeConstraintProperties>): void {
  assertVector2(properties.MinSize, 'MinSize');
  assertVector2(properties.MaxSize, 'MaxSize');

  for (const axis of ['X', 'Y'] as const) {
    assertNonNegativeFinite(properties.MinSize[axis], `MinSize.${axis}`);
    assertNonNegativeFinite(properties.MaxSize[axis], `MaxSize.${axis}`);

    if (properties.MaxSize[axis] < properties.MinSize[axis]) {
      throw new RangeError(`MaxSize.${axis} must be at least MinSize.${axis}.`);
    }
  }
}
