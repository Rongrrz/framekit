import { descendantIds, orderedNodes, validateHierarchy, type SceneDocument } from './document';

/** A null parent means the canvas; before identifies a sibling insertion point. */
export type MoveDestination = Readonly<{ parent: string | null; before?: string }>;

/** Compute and validate the entire move before touching history or persistent preview objects. */
export const moveBranch = (
  document: SceneDocument,
  id: string,
  destination: MoveDestination,
): SceneDocument => {
  const branch = descendantIds(document, id);
  const ordered = orderedNodes(document);
  const moving = ordered.filter((node) => branch.has(node.id));

  if (!moving.length || branch.has(destination.parent ?? '') || destination.before === id) {
    throw new TypeError('An object cannot be moved into its own branch.');
  }

  const original = moving[0]!;
  const siblings = document.nodes.filter((node) => node.parent === original.parent);
  const nextSibling = siblings[siblings.indexOf(original) + 1]?.id;

  if (original.parent === destination.parent && nextSibling === destination.before) {
    validateHierarchy(document);
    return document;
  }

  const remaining = ordered.filter((node) => !branch.has(node.id));
  const sibling = destination.before
    ? remaining.find((node) => node.id === destination.before)
    : undefined;

  if (destination.before && (!sibling || sibling.parent !== destination.parent)) {
    throw new TypeError('The insertion point must be a sibling in the destination.');
  }

  let index = sibling ? remaining.indexOf(sibling) : remaining.length;

  if (!sibling && destination.parent !== null) {
    const ownerBranch = descendantIds({ ...document, nodes: remaining }, destination.parent);
    index = remaining.findLastIndex((node) => ownerBranch.has(node.id)) + 1;
  }

  const nodes = [
    ...remaining.slice(0, index),
    ...moving.map((node) => (node.id === id ? { ...node, parent: destination.parent } : node)),
    ...remaining.slice(index),
  ];
  const result = { ...document, nodes };
  validateHierarchy(result);
  return result;
};
