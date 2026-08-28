import type { Motion } from '../animation/motion';
import type { AnimationGoal } from '../animation/types';
import type { LayoutNode, StyleModifierNode } from '../shared/runtime/modifier';
import type { NodeProperties } from '../shared/runtime/node-state';
import type { GuiNode } from '../shared/runtime/render';
import { assertBoolean } from '../shared/runtime/validation';

type ModifierNode<Properties extends NodeProperties = NodeProperties> =
  | LayoutNode<Properties>
  | StyleModifierNode<Properties>;

/** Settings for a modifier that springs out before detaching. */
export type SpringModifierToggleOptions<Properties extends NodeProperties> = Readonly<{
  parent: GuiNode;
  modifier: ModifierNode<Properties>;
  motion: Motion<Properties>;
  active: AnimationGoal<Properties>;
  inactive: AnimationGoal<Properties>;
  isActive: () => boolean;
}>;

/** Attaches or detaches a retained modifier without recreating it. */
export function setModifierAttached(
  parent: GuiNode,
  modifier: ModifierNode,
  attached: boolean,
): void {
  assertBoolean(attached, 'Attached');
  if (attached) {
    if (modifier.Parent !== parent) modifier.Parent = parent;
    return;
  }

  if (modifier.Parent === parent) modifier.Parent = undefined;
}

/** Springs a modifier to its inactive state before detaching it. */
export function createSpringModifierToggle<Properties extends NodeProperties>(
  options: SpringModifierToggleOptions<Properties>,
): (active: boolean) => void {
  options.motion.completed.subscribe(() => {
    if (!options.isActive() && options.modifier.Parent === options.parent) {
      options.modifier.Parent = undefined;
    }
  });

  return (active) => {
    if (!active) {
      if (options.modifier.Parent === options.parent) options.motion.spring(options.inactive);
      return;
    }

    if (options.modifier.Parent !== options.parent) {
      options.modifier.setProperties(options.inactive);
      options.modifier.Parent = options.parent;
    }
    options.motion.spring(options.active);
  };
}
