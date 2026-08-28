import type { Node, NodeProperties } from '../runtime/node-state';
import { createMotion, type Motion, type SpringOptions } from './motion';
import type { AnimationGoal } from './types';

const retainedMotions = new WeakMap<Node, Motion>();

/** Retargets node properties with a lazily retained spring using Ripple's defaults. */
export function spring<Properties extends NodeProperties>(
  node: Node<Properties>,
  goal: AnimationGoal<Properties>,
): void;
/** Retargets node properties with settings applied only to this goal's properties. */
export function spring<Properties extends NodeProperties>(
  node: Node<Properties>,
  goal: AnimationGoal<Properties>,
  settings: SpringOptions,
): void;
export function spring<Properties extends NodeProperties>(
  node: Node<Properties>,
  goal: AnimationGoal<Properties>,
  settings?: SpringOptions,
): void {
  let motion = retainedMotions.get(node) as Motion<Properties> | undefined;
  if (!motion) {
    motion = createMotion(node);
    retainedMotions.set(node, motion as Motion);
  }
  if (settings) motion.spring(goal, settings);
  else motion.spring(goal);
}
