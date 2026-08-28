import { fk } from 'framekit';

/** Keeps an existing modifier handle attached or detached without recreating it. */
export function setModifierAttached(parent: fk.Node, modifier: fk.Node, attached: boolean): void {
  const currentParent = fk.parent(modifier);
  if (attached && currentParent !== parent) fk.append(parent, modifier);
  if (!attached && currentParent !== undefined) fk.detach(modifier);
}

type SpringModifierOptions<Props extends fk.NodeProps> = Readonly<{
  parent: fk.Node;
  modifier: fk.Node<Props>;
  motion: fk.Motion<Props>;
  active: fk.AnimationGoal<Props>;
  inactive: fk.AnimationGoal<Props>;
  isActive: () => boolean;
}>;

/** Springs a modifier to neutral before detaching and restores it from neutral when reattached. */
export function createSpringModifierToggle<Props extends fk.NodeProps>(
  options: SpringModifierOptions<Props>,
): (active: boolean) => void {
  options.motion.completed.subscribe(() => {
    if (!options.isActive() && fk.parent(options.modifier) === options.parent) {
      fk.detach(options.modifier);
    }
  });

  return (active) => {
    if (!active) {
      if (fk.parent(options.modifier) === options.parent) options.motion.spring(options.inactive);
      return;
    }

    if (fk.parent(options.modifier) !== options.parent) {
      fk.update(options.modifier, options.inactive);
      fk.append(options.parent, options.modifier);
    }
    options.motion.spring(options.active);
  };
}
