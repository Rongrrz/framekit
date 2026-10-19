import deriveValuesEmitEventsExample from '../../../examples/state/derive-values-emit-events.ts?example';
import keepViewsStableByKeyExample from '../../../examples/state/keep-views-stable-by-key.ts?example';
import observeWithAnOwnerExample from '../../../examples/state/observe-with-an-owner.ts?example';
import virtualizeLargeCollectionsExample from '../../../examples/state/virtualize-large-collections.ts?example';
import type { ReferenceChapter } from './chapter';

export const stateChapter = {
  title: 'State & collections',
  summary:
    'Keep data separate from views. Bind a value to an owner, then let stable keys preserve the identity of repeated elements.',
  sections: [
    {
      title: 'Observe with an owner',
      body: 'createObservableValue stores a value. get reads it; set publishes changes using Object.is equality. watchOwnedValue delivers the current value immediately, listens for changes, and unsubscribes when its owner is destroyed.',
      code: observeWithAnOwnerExample,
      note: 'Replace arrays and objects when updating shared data. Mutating an object in place and setting the same reference does not publish a change.',
    },
    {
      title: 'Derive values; emit events',
      body: 'createComputedValue produces a readonly value. Declare every observable read by the derive function as a dependency. A signal represents an event rather than stored state; register its unsubscribe function with an owner.',
      code: deriveValuesEmitEventsExample,
      note: 'Computed values observe their sources only while subscribed. A direct onChange subscription does not immediately deliver current state; watchOwnedValue does.',
    },
    {
      title: 'Keep views stable by key',
      body: 'bindKeyedChildren creates unattached views and owns their placement. Matching keys retain instance identity; removed keys destroy their views. update runs for both new and retained views.',
      code: keepViewsStableByKeyExample,
      note: 'Keys must be unique strings or numbers. create must return a unique, live, unattached view. Do not independently destroy or reparent views owned by this binding. Add a layout modifier to arrange the children.',
    },
    {
      title: 'Virtualize large collections',
      body: 'bindVirtualList mounts only the visible window plus overscan. Use a fixed pixel itemHeight or { estimate: 48 } for measured rows with different heights. Key-based selection lives in application data even when an offscreen view is destroyed.',
      code: virtualizeLargeCollectionsExample,
      note: 'Use a dedicated ScrollingFrame. Arrow keys, Home, End, PageUp, and PageDown move selection. Source updates preserve the first visible key and its offset when it survives. Open Examples for the 100,000-row fixed and measured collection demos. With measured heights, use AutomaticSize: Y for wrapped text or set an explicit row height. Unseen rows use estimates until mounted.',
    },
  ],
} as const satisfies ReferenceChapter;
