import { fk } from 'framekit';

/** Keeps an existing modifier handle attached or detached without recreating it. */
export function setModifierAttached(parent: fk.Node, modifier: fk.Node, attached: boolean): void {
  const currentParent = fk.parent(modifier);
  if (attached && currentParent === undefined) fk.append(parent, modifier);
  if (!attached && currentParent !== undefined) fk.detach(modifier);
}
