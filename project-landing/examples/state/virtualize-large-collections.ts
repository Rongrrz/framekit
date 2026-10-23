import {
  createScrollingFrame,
  createTextLabel,
  createObservableValue,
  bindVirtualList,
  udim2FromOffset,
} from 'framekit';

const viewport = createScrollingFrame({ Size: udim2FromOffset(320, 240) });

const items = createObservableValue([{ id: 'a', title: 'First' }]);

const selection = createObservableValue<string | number | undefined>(undefined);

const list = bindVirtualList(viewport, items, {
  itemHeight: 36,
  overscan: 3,
  selection,
  key: (item) => item.id,
  create: () => createTextLabel(),

  update: (view, item) => {
    view.Text = item.title;
  },
});

list.scrollToKey('a');
