import { fk } from 'framekit';
/** Keeps an existing modifier handle attached or detached without recreating it. */

export function setModifierAttached(parent: fk.Node, modifier: fk.Node, attached: boolean): void {
  const currentParent = modifier.Parent;
  if (attached && currentParent !== parent) parent.addChild(modifier);
  if (!attached && currentParent !== undefined) modifier.removeFromParent();
}

type SpringModifierOptions<Props extends fk.NodeProperties> = Readonly<{
  parent: fk.Node;
  modifier: fk.Node<Props>;
  motion: fk.Motion<Props>;
  active: fk.AnimationGoal<Props>;
  inactive: fk.AnimationGoal<Props>;
  isActive: () => boolean;
}>;
/** Springs a modifier to neutral before detaching and restores it from neutral when reattached. */

export function createSpringModifierToggle<Props extends fk.NodeProperties>(
  options: SpringModifierOptions<Props>,
): (active: boolean) => void {
  options.motion.completed.subscribe(() => {
    if (!options.isActive() && options.modifier.Parent === options.parent) {
      options.modifier.removeFromParent();
    }
  });
  return (active) => {
    if (!active) {
      if (options.modifier.Parent === options.parent) options.motion.spring(options.inactive);
      return;
    }
    if (options.modifier.Parent !== options.parent) {
      options.modifier.setProperties(options.inactive);
      options.parent.addChild(options.modifier);
    }
    options.motion.spring(options.active);
  };
}
