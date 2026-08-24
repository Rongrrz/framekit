import { fk } from 'framekit';

import type { Product } from '../data/products';

export type CartState = Readonly<{
  quantities: ReadonlyMap<string, number>;
  itemCount: number;
  total: number;
}>;

type CartStore = fk.state.ObservableValue<CartState> &
  Readonly<{
    add(product: Product): void;
    remove(product: Product): void;
  }>;

const emptyCart: CartState = {
  quantities: new Map(),
  itemCount: 0,
  total: 0,
};

const state = fk.state.observable(emptyCart);

function changeQuantity(product: Product, delta: number): void {
  state.update((current) => {
    const previousQuantity = current.quantities.get(product.sku) ?? 0;
    const nextQuantity = Math.max(0, previousQuantity + delta);
    const appliedDelta = nextQuantity - previousQuantity;
    if (appliedDelta === 0) return current;

    const quantities = new Map(current.quantities);
    if (nextQuantity === 0) quantities.delete(product.sku);
    else quantities.set(product.sku, nextQuantity);

    return {
      quantities,
      itemCount: current.itemCount + appliedDelta,
      total: current.total + appliedDelta * product.price,
    };
  });
}

function add(product: Product): void {
  changeQuantity(product, 1);
}

function remove(product: Product): void {
  changeQuantity(product, -1);
}

export const cart: CartStore = Object.freeze(Object.assign(state, { add, remove }));
