import {
  createFrame,
  createObservableValue,
  createComputedValue,
  createSignalEmitter,
} from 'framekit';

const owner = createFrame();

const price = createObservableValue(12);

const quantity = createObservableValue(2);

const total = createComputedValue([price, quantity], () => price.get() * quantity.get());

console.log(total.get()); // 24

const saved = createSignalEmitter<[string]>();

owner.onDestroy(saved.subscribe((id) => console.log(id)));

saved.emit('order-1');
