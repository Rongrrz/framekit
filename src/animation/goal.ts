import { snapshotPropertyValue } from '../core/internal/snapshot';
import type { Instance, InstanceProperties } from '../core/node/instance';
import { getPropertiesSnapshot, validateNodeProperties } from '../core/node/properties';
import { isDiscreteAnimationProperty, type AnimationGoal } from './types';
import {
  assertCompatibleAnimationValues,
  decomposeAnimationValue,
  type DecomposedAnimationValue,
} from './value';

type AnimationKind = 'spring' | 'tween';

type AnimationGoalMessages = Readonly<{
  emptyGoal: string;
  invalidValue: string;
}>;

const messagesByKind = {
  spring: {
    emptyGoal: 'A spring needs at least one goal property.',
    invalidValue: 'animatable',
  },
  tween: {
    emptyGoal: 'A tween needs at least one goal property.',
    invalidValue: 'compatible tweenable',
  },
} satisfies Record<AnimationKind, AnimationGoalMessages>;

type PreparedAnimationProperty<Properties extends InstanceProperties> = Readonly<{
  property: keyof Properties;
  goalValue: unknown;
  start: DecomposedAnimationValue;
  goal: DecomposedAnimationValue;
}>;

type ResolveStartValue<Properties extends InstanceProperties> = (
  property: keyof Properties,
  currentValue: Properties[keyof Properties],
) => unknown;

/** Validates and decomposes an animation goal once at the node boundary. */
export function prepareAnimationGoal<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  goal: AnimationGoal<Properties>,
  kind: AnimationKind,
  resolveStartValue?: ResolveStartValue<Properties>,
): readonly PreparedAnimationProperty<Properties>[] {
  const currentProperties = getPropertiesSnapshot(node);
  // AnimationGoal is a key-restricted Partial<Properties>; this view is used by runtime validation.
  const propertyGoal = snapshotPropertyValue(goal) as unknown as Partial<Properties>;
  const goalProperties = Object.keys(propertyGoal) as (keyof Properties)[];
  const messages = messagesByKind[kind];

  if (goalProperties.length === 0) throw new TypeError(messages.emptyGoal);

  const preparedProperties = goalProperties.map((property) => {
    if (!Object.hasOwn(currentProperties, property)) {
      throw new TypeError(
        `Unknown ${kind} property "${String(property)}" on ${currentProperties.Name}.`,
      );
    }

    const propertyName = String(property);
    if (isDiscreteAnimationProperty(property)) {
      throw new TypeError(`Property "${propertyName}" changes discretely and cannot be animated.`);
    }
    const goalValue = propertyGoal[property];
    const currentValue = currentProperties[property];
    const startValue = resolveStartValue ? resolveStartValue(property, currentValue) : currentValue;

    try {
      const start = decomposeAnimationValue(startValue, propertyName);
      const preparedGoal = decomposeAnimationValue(goalValue, propertyName);
      assertCompatibleAnimationValues(start, preparedGoal, propertyName);
      return { property, goalValue, start, goal: preparedGoal };
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      throw new TypeError(
        `Property "${propertyName}" does not contain ${messages.invalidValue} values.`,
        { cause: error },
      );
    }
  });

  try {
    validateNodeProperties(node, propertyGoal);
  } catch (error) {
    throw new TypeError(`The ${kind} goal contains invalid property values.`, { cause: error });
  }
  return preparedProperties;
}
