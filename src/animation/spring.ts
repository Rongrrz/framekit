import type { Node, NodeProperties } from '../shared/runtime/node';
import {
  createSpringBinding,
  type SpringBinding,
  type SpringController,
  type SpringOptions,
} from './spring-controller';
import type { AnimationGoal } from './types';

const springsByNode = new WeakMap<Node, SpringBinding<NodeProperties>>();

/** Returns the spring controls retained for a node without starting an animation. */
export function spring<Properties extends NodeProperties>(
  node: Node<Properties>,
): SpringController<Properties>;
/** Retargets node properties and returns the retained playback controls. */
export function spring<Properties extends NodeProperties>(
  node: Node<Properties>,
  goal: AnimationGoal<Properties>,
): SpringController<Properties>;
/** Retargets node properties with settings applied only to this goal's properties. */
export function spring<Properties extends NodeProperties>(
  node: Node<Properties>,
  goal: AnimationGoal<Properties>,
  settings: SpringOptions,
): SpringController<Properties>;
export function spring<Properties extends NodeProperties>(
  node: Node<Properties>,
  goal?: AnimationGoal<Properties>,
  settings?: SpringOptions,
): SpringController<Properties> {
  let binding = springsByNode.get(node) as SpringBinding<Properties> | undefined;
  if (!binding) {
    binding = createSpringBinding(node);
    springsByNode.set(node, binding as SpringBinding<NodeProperties>);
  }
  if (goal) binding.animate(goal, settings);
  return binding.controller;
}
