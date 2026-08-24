import { fk } from 'framekit';

import { productsBySku } from '../data/products';
import { decorate } from '../shared/decorate';
import { createLabel } from '../shared/label';
import { scalePosition, scaleSize } from '../shared/layout';
import { createPanel } from '../shared/panel';
import { palette } from '../shared/theme';
import { cart, type CartState } from '../state/cart';
import { createCartItem, type CartItemController } from './cart-item';

const deckWidth = 1200;
const deckHeight = 760;
const panelWidth = 300;
const panelHeight = 578;
const viewportHeight = 386;

export const cartSidebar = createPanel(
  'Cart',
  scaleSize(panelWidth, panelHeight, deckWidth, deckHeight),
  scalePosition(880, 164, deckWidth, deckHeight),
);
fk.append(
  cartSidebar,
  createLabel({
    text: 'YOUR CART',
    size: scaleSize(170, 22, panelWidth, panelHeight),
    position: scalePosition(14, 14, panelWidth, panelHeight),
    textSize: 12,
    weight: 850,
  }),
);
const itemCount = createLabel({
  text: '0 ITEMS',
  size: scaleSize(100, 22, panelWidth, panelHeight),
  position: scalePosition(186, 14, panelWidth, panelHeight),
  textSize: 8,
  color: palette.muted,
  xAlignment: 'Right',
});
fk.append(cartSidebar, itemCount);
fk.append(
  cartSidebar,
  createLabel({
    text: 'Add products from the catalog. Your cart stays visible while you browse.',
    size: scaleSize(272, 28, panelWidth, panelHeight),
    position: scalePosition(14, 38, panelWidth, panelHeight),
    textSize: 8,
    color: palette.muted,
    wrapped: true,
  }),
);

const scroller = fk.createScrollingFrame({
  Name: 'CartItems',
  Size: scaleSize(272, viewportHeight, panelWidth, panelHeight),
  Position: scalePosition(14, 74, panelWidth, panelHeight),
  BackgroundTransparency: 1,
  ScrollingDirection: 'Y',
});
const content = fk.createFrame({
  Name: 'CartContent',
  Size: fk.udim2FromScale(1, 1),
  BackgroundTransparency: 1,
});
const empty = createLabel({
  text: 'Your cart is empty.',
  size: fk.udim2FromScale(1, 1),
  textSize: 10,
  color: palette.muted,
  xAlignment: 'Center',
});
fk.append(content, empty);
fk.append(scroller, content);
fk.append(cartSidebar, scroller);

const subtotal = createLabel({
  text: 'SUBTOTAL',
  size: scaleSize(120, 20, panelWidth, panelHeight),
  position: scalePosition(14, 474, panelWidth, panelHeight),
  textSize: 9,
  color: palette.muted,
});
const total = createLabel({
  text: '$0',
  size: scaleSize(150, 28, panelWidth, panelHeight),
  position: scalePosition(136, 468, panelWidth, panelHeight),
  textSize: 20,
  color: palette.coral,
  xAlignment: 'Right',
  weight: 900,
});
fk.append(cartSidebar, subtotal);
fk.append(cartSidebar, total);

const checkout = fk.createTextButton({
  Name: 'Checkout',
  Size: scaleSize(272, 46, panelWidth, panelHeight),
  Position: scalePosition(14, 510, panelWidth, panelHeight),
  BackgroundColor3: palette.text,
  Text: 'PROCEED TO CHECKOUT',
  TextColor3: palette.panel,
  TextSize: 10,
  FontWeight: 850,
  Disabled: true,
});
decorate(checkout, 14, palette.text);

function confirmCheckout(): void {
  fk.update(checkout, { Text: 'CHECKOUT READY  ✓', Disabled: true });
}

fk.on(checkout, 'MouseButton1Click', confirmCheckout);
fk.append(cartSidebar, checkout);

const rows = new Map<string, CartItemController>();

function renderCart(state: CartState): void {
  for (const [sku] of state.quantities) {
    if (rows.has(sku)) continue;
    const product = productsBySku.get(sku)!;
    const row = createCartItem(product);
    rows.set(sku, row);
    fk.append(content, row.root);
  }

  const visibleRows = [...state.quantities.keys()].map((sku) => rows.get(sku)!);
  const contentHeight = Math.max(
    viewportHeight,
    visibleRows.length * 70 + Math.max(0, visibleRows.length - 1) * 8,
  );
  for (const [index, row] of visibleRows.entries()) {
    row.setPosition(index, contentHeight);
  }
  fk.update(content, { Size: fk.udim2FromScale(1, contentHeight / viewportHeight) });
  fk.update(empty, { Visible: state.itemCount === 0 });
  fk.update(itemCount, {
    Text: `${state.itemCount} ${state.itemCount === 1 ? 'ITEM' : 'ITEMS'}`,
  });
  fk.update(total, { Text: `$${state.total}` });
  fk.update(checkout, {
    Text: 'PROCEED TO CHECKOUT',
    Disabled: state.itemCount === 0,
  });
}

fk.state.observe(cartSidebar, cart, renderCart);
