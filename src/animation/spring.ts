import type { Node, NodeProps } from '../runtime/state';
import { createMotion, type Motion, type SpringOptions } from './motion';
import type { AnimationGoal } from './types';

const retainedMotions = new WeakMap<Node, Motion>();

/** Retargets node properties with a lazily retained spring using Ripple's defaults. */
export function spring<Props extends NodeProps>(
  node: Node<Props>,
  goal: AnimationGoal<Props>,
): void;
/** Retargets node properties with settings applied only to this goal's properties. */
export function spring<Props extends NodeProps>(
  node: Node<Props>,
  goal: AnimationGoal<Props>,
  settings: SpringOptions,
): void;
export function spring<Props extends NodeProps>(
  node: Node<Props>,
  goal: AnimationGoal<Props>,
  settings?: SpringOptions,
): void {
  let motion = retainedMotions.get(node) as Motion<Props> | undefined;
  if (!motion) {
    motion = createMotion(node);
    retainedMotions.set(node, motion as Motion);
  }
  if (settings) motion.spring(goal, settings);
  else motion.spring(goal);
}
