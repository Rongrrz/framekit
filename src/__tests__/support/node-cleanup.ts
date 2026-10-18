import { afterEach } from 'vitest';

import type { Instance } from '#internal/runtime/node/instance.js';

/** Tracks test-owned nodes so every test exercises normal lifecycle cleanup. */
export function destroyNodesAfterEach(): <Node extends Instance>(node: Node) => Node {
  const nodes = new Set<Instance>();

  afterEach(() => {
    const errors: unknown[] = [];

    for (const node of nodes) {
      try {
        node.destroy();
      } catch (error) {
        errors.push(error);
      }
    }

    nodes.clear();

    if (errors.length > 0) {
      throw new AggregateError(errors, 'Test-owned node cleanup failed.');
    }
  });

  return (node) => {
    nodes.add(node);

    return node;
  };
}
