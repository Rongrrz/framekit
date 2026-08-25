import { fk } from 'framekit';

import type { Product } from '../data/products';
import { decorate } from '../shared/decorate';
import { bindHover } from '../shared/hover';
import { createLabel } from '../shared/label';
import { scalePosition, scaleSize } from '../shared/layout';
import { palette } from '../shared/theme';
import { cart, type CartState } from '../state/cart';

const rowWidth = 272;
const rowHeight = 70;

export type CartItemController = Readonly<{
  root: fk.FrameNode;
  setPosition(index: number, contentHeight: number): void;
}>;

export function createCartItem(product: Product): CartItemController {
  const root = fk.createFrame({
    Name: `Cart-${product.sku}`,
    BackgroundColor3: palette.raised,
    BackgroundTransparency: 0.2,
  });
  decorate(root, 12, palette.border);

  const icon = fk.createTextLabel({
    Size: scaleSize(44, 44, rowWidth, rowHeight),
    Position: scalePosition(8, 8, rowWidth, rowHeight),
    BackgroundColor3: product.accent,
    BackgroundTransparency: 0.82,
    Text: product.icon,
    TextColor3: product.accent,
    TextSize: 20,
  });
  fk.append(icon, fk.createUICorner({ CornerRadius: 10 }));
  fk.append(root, icon);
  fk.append(
    root,
    createLabel({
      text: product.name,
      size: scaleSize(126, 28, rowWidth, rowHeight),
      position: scalePosition(60, 7, rowWidth, rowHeight),
      textSize: 8,
      wrapped: true,
      weight: 750,
    }),
  );
  fk.append(
    root,
    createLabel({
      text: `$${product.price} each`,
      size: scaleSize(126, 18, rowWidth, rowHeight),
      position: scalePosition(60, 37, rowWidth, rowHeight),
      textSize: 8,
      color: product.accent,
    }),
  );

  const decrease = createQuantityButton('−', scalePosition(194, 24, rowWidth, rowHeight));
  const quantity = createLabel({
    text: '1',
    size: scaleSize(22, 24, rowWidth, rowHeight),
    position: scalePosition(216, 24, rowWidth, rowHeight),
    textSize: 9,
    xAlignment: 'Center',
    weight: 800,
  });
  const increase = createQuantityButton('+', scalePosition(240, 24, rowWidth, rowHeight));
  function decreaseQuantity(): void {
    cart.remove(product);
  }

  function increaseQuantity(): void {
    cart.add(product);
  }

  function renderQuantity(state: CartState): void {
    const value = state.quantities.get(product.sku) ?? 0;
    fk.update(root, { Visible: value > 0 });
    fk.update(quantity, { Text: String(value) });
  }

  function setPosition(index: number, contentHeight: number): void {
    fk.update(root, {
      Size: scaleSize(rowWidth, rowHeight, rowWidth, contentHeight),
      Position: scalePosition(0, index * 78, rowWidth, contentHeight),
    });
  }

  fk.on(decrease, 'MouseButton1Click', decreaseQuantity);
  fk.on(increase, 'MouseButton1Click', increaseQuantity);
  fk.append(root, decrease);
  fk.append(root, quantity);
  fk.append(root, increase);
  fk.state.observe(root, cart.value, renderQuantity);

  return { root, setPosition };
}

function createQuantityButton(text: string, position: fk.UDim2): fk.TextButtonNode {
  const button = fk.createTextButton({
    Size: scaleSize(20, 24, rowWidth, rowHeight),
    Position: position,
    BackgroundColor3: palette.panel,
    Text: text,
    TextColor3: palette.text,
    TextSize: 12,
    FontWeight: 850,
  });
  decorate(button, 7, palette.border);
  bindHover(button, palette.panel, palette.coral);
  return button;
}
