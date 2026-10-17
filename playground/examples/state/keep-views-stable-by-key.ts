import { createFrame, createTextLabel, createObservableValue, bindKeyedChildren } from 'framekit';

const list = createFrame();

const items = createObservableValue([{ id: 'a', title: 'First' }]);

const dispose = bindKeyedChildren(list, items, {
  key: (item) => item.id,
  create: () => createTextLabel(),

  update: (view, item) => {
    view.Text = item.title;
  },
});

items.set([{ id: 'a', title: 'Renamed' }]); // Same view.

dispose(); // Destroys the generated views.
