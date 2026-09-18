import { afterEach } from 'vitest';

import type { Instance } from '../../core';

/** Tracks test-owned nodes so every test exercises normal lifecycle cleanup. */
export function destroyNodesAfterEach(): <Node extends Instance>(node: Node) => Node {
  const nodes = new Set<Instance>();
  afterEach(() => {
    for (const node of nodes) node.destroy();
    nodes.clear();
  });
  return (node) => {
    nodes.add(node);
    return node;
  };
}
