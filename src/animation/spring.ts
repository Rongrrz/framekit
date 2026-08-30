import type { Instance, InstanceProperties } from '../shared/runtime/node';
import {
  createSpringBinding,
  type SpringBinding,
  type SpringController,
  type SpringOptions,
} from './spring-controller';
import type { AnimationGoal } from './types';

const springsByNode = new WeakMap<Instance, SpringBinding<InstanceProperties>>();

/** Returns the spring controls retained for a node without starting an animation. */
export function spring<Properties extends InstanceProperties>(
  node: Instance<Properties>,
): SpringController<Properties>;
/** Retargets node properties and returns the retained playback controls. */
export function spring<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  goal: AnimationGoal<Properties>,
): SpringController<Properties>;
/** Retargets node properties with settings applied only to this goal's properties. */
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
    springsByNode.set(node, binding as SpringBinding<InstanceProperties>);
  }
  if (goal) binding.animate(goal, settings);
  return binding.controller;
}
