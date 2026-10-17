import attachReparentTraverseExample from '../../../examples/lifecycle/attach-reparent-traverse.ts?example';
import ownExternalResourcesExample from '../../../examples/lifecycle/own-external-resources.ts?example';
import reuseOrReleaseExample from '../../../examples/lifecycle/reuse-or-release.ts?example';
import writePropertiesAsATransactionExample from '../../../examples/lifecycle/write-properties-as-a-transaction.ts?example';
import type { ReferenceChapter } from './chapter';

export const lifecycleChapter = {
  title: 'Ownership & cleanup',
  summary:
    'The FrameKit tree is the source of truth for ownership. Hiding, detaching, unmounting, and destroying have deliberately different lifetimes.',
  sections: [
    {
      title: 'Attach, reparent & traverse',
      body: 'Assign Parent to attach a child or move it between live parents. ScreenGui is a root and cannot have a Parent. getChildren and getDescendants return snapshots of the FrameKit hierarchy, including modifiers.',
      code: attachReparentTraverseExample,
      note: 'Names are editable labels, not unique IDs. reorderChildren requires an exact permutation of all direct children. Cycles and invalid parent relationships are rejected.',
    },
    {
      title: 'Reuse or release',
      body: 'Visible = false hides an element. Parent = undefined detaches it. ScreenGui.unmount removes the root from the document. These keep instances, listeners, subscriptions, and animations alive. destroy is permanent and recursively releases descendants.',
      code: reuseOrReleaseExample,
      note: 'Destroying twice is harmless. Property reads and other operations requiring a live node throw after destruction; check isDestroyed when an external callback may outlive the node.',
    },
    {
      title: 'Own external resources',
      body: 'Native node event listeners and owned value watchers clean up automatically. Register other subscriptions, browser listeners, timers, sockets, and detached caller-owned content with onDestroy.',
      code: ownExternalResourcesExample,
      note: 'Children are destroyed before their owner cleanup callbacks run. Cleanup continues when one callback fails; one error is rethrown and multiple errors become an AggregateError.',
    },
    {
      title: 'Write properties as a transaction',
      body: 'Direct assignments and setProperties use the same synchronous validation and render path. setProperties validates the complete patch before committing. Use it for related changes that should be validated together.',
      code: writePropertiesAsATransactionExample,
      note: 'Property observers run only for changed values. Equal-value direct writes still stop animation ownership for the written property. Avoid observer feedback loops: listener-triggered writes are immediate.',
    },
  ],
} as const satisfies ReferenceChapter;
