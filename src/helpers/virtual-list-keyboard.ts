import type { ScrollingFrame } from '#elements/scrolling-frame.js';
import type { Unsubscribe } from '#state/signal.js';
import type { ObservableValue } from '#state/value.js';

import { isTextEntry } from './composite-keyboard.js';
import type { VirtualListModel } from './virtual-list-model.js';

/** Listbox keys share data selection even when their target view is not mounted. */
export const bindVirtualListKeyboard = <Item>(
  viewport: ScrollingFrame,
  selectionValue: ObservableValue<string | number | undefined>,
  model: VirtualListModel<Item>,
  scrollToKey: (key: string | number) => void,
): Unsubscribe => {
  const element = viewport.unsafeElement;
  const { measured, estimatedHeight, offset: offsetAt, indexAt } = model;

  // Composite selection handles navigation before the frame's default keyboard scrolling.
  return viewport.on(
    'keydown',
    (event) => {
      if (
        event.defaultPrevented ||
        isTextEntry(event.target) ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.isComposing ||
        model.entries.length === 0
      ) {
        return;
      }

      const selection = selectionValue.get();
      const current = selection === undefined ? -1 : (model.indexOf(selection) ?? -1);
      const page = Math.max(1, Math.floor(element.clientHeight / estimatedHeight));
      const currentTop = offsetAt(Math.max(0, current));
      let index: number;

      if (event.key === 'ArrowDown') {
        index = Math.min(current + 1, model.entries.length - 1);
      } else if (event.key === 'ArrowUp') {
        index = Math.max(current - 1, 0);
      } else if (event.key === 'Home') {
        index = 0;
      } else if (event.key === 'End') {
        index = model.entries.length - 1;
      } else if (event.key === 'PageDown') {
        index = measured
          ? Math.max(
              Math.min(current + 1, model.entries.length - 1),
              indexAt(currentTop + element.clientHeight),
            )
          : Math.min(Math.max(0, current) + page, model.entries.length - 1);
      } else if (event.key === 'PageUp') {
        index = measured
          ? Math.min(
              Math.max(0, current - 1),
              indexAt(Math.max(0, currentTop - element.clientHeight)),
            )
          : Math.max(current - page, 0);
      } else {
        return;
      }

      event.preventDefault();

      const key = model.entries[index]!.key;
      scrollToKey(key);
      selectionValue.set(key);
    },
    { capture: true },
  );
};
