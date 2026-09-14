import type { Instance, InstanceProperties } from '../core/node/instance';
import {
  createSpringBinding,
  type SpringBinding,
  type SpringController,
  type SpringOptions,
} from './spring-controller';
import type { AnimationGoal } from './types';

const springsByNode = new WeakMap<Instance, SpringBinding<InstanceProperties>>();

/** Returns the retained spring for a node without changing its goal. */
export function spring<Properties extends InstanceProperties>(
  node: Instance<Properties>,
): SpringController<Properties>;
/** Retargets a node's retained spring. */
export function spring<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  goal: AnimationGoal<Properties>,
): SpringController<Properties>;
/** Retargets a node's retained spring with per-property settings. */
export function spring<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  goal: AnimationGoal<Properties>,
  settings: SpringOptions,
): SpringController<Properties>;
export function spring<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  goal?: AnimationGoal<Properties>,
  settings?: SpringOptions,
): SpringController<Properties> {
  let binding = springsByNode.get(node) as SpringBinding<Properties> | undefined;
  if (!binding) {
    binding = createSpringBinding(node);
    springsByNode.set(node, binding as unknown as SpringBinding<InstanceProperties>);
  }
  if (goal) binding.animate(goal, settings);
  return binding.controller;
}
