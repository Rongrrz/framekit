import { fk } from 'framekit';

import type { Product } from '../data/products';
import { decorate } from '../shared/decorate';
import { createLabel } from '../shared/label';
import { scalePosition, scaleSize } from '../shared/layout';
import { palette } from '../shared/theme';
import { cart, type CartState } from '../state/cart';

const gridWidth = 808;
const cardWidth = 190;
const cardHeight = 155;

export type ProductCardController = Readonly<{
  root: fk.FrameNode;
  setPosition(index: number, contentHeight: number): void;
  setVisible(visible: boolean): void;
}>;

export function createProductCard(product: Product): ProductCardController {
  const root = fk.createFrame({
    Name: product.sku,
    BackgroundColor3: palette.panel,
  });
  decorate(root, 14, palette.border);

  const visual = fk.createTextLabel({
    Name: 'ProductVisual',
    Size: scaleSize(172, 54, cardWidth, cardHeight),
    Position: scalePosition(9, 8, cardWidth, cardHeight),
    BackgroundColor3: product.accent,
    BackgroundTransparency: 0.82,
    Text: product.icon,
    TextColor3: product.accent,
    TextSize: 28,
    FontWeight: 800,
  });
  fk.append(visual, fk.createUICorner({ CornerRadius: 11 }));
  fk.append(root, visual);

  fk.append(
    root,
    createLabel({
      text: product.name,
      size: scaleSize(172, 28, cardWidth, cardHeight),
      position: scalePosition(9, 65, cardWidth, cardHeight),
      textSize: 9,
      wrapped: true,
      weight: 800,
    }),
  );
  fk.append(
    root,
    createLabel({
      text: `★ ${product.rating}  (${product.reviews.toLocaleString()})`,
      size: scaleSize(172, 14, cardWidth, cardHeight),
      position: scalePosition(9, 94, cardWidth, cardHeight),
      textSize: 8,
      color: palette.amber,
    }),
  );
  fk.append(
    root,
    createLabel({
      text: `FREE delivery ${product.delivery}`,
      size: scaleSize(172, 14, cardWidth, cardHeight),
      position: scalePosition(9, 108, cardWidth, cardHeight),
      textSize: 7,
      color: palette.muted,
    }),
  );
  fk.append(
    root,
    createLabel({
      text: `$${product.price}`,
      size: scaleSize(92, 24, cardWidth, cardHeight),
      position: scalePosition(9, 126, cardWidth, cardHeight),
      textSize: 14,
      color: palette.text,
      weight: 850,
    }),
  );

  const decrease = createQuantityButton('−', scalePosition(112, 126, cardWidth, cardHeight));
  const quantity = createLabel({
    text: '0',
    size: scaleSize(24, 22, cardWidth, cardHeight),
    position: scalePosition(134, 126, cardWidth, cardHeight),
    textSize: 9,
    xAlignment: 'Center',
    weight: 800,
  });
  const increase = createQuantityButton('+', scalePosition(160, 126, cardWidth, cardHeight));
  function decreaseQuantity(): void {
    cart.remove(product);
  }

  function increaseQuantity(): void {
    cart.add(product);
  }

  fk.on(decrease, 'MouseButton1Click', decreaseQuantity);
  fk.on(increase, 'MouseButton1Click', increaseQuantity);
  fk.append(root, decrease);
  fk.append(root, quantity);
  fk.append(root, increase);

  function setPosition(index: number, contentHeight: number): void {
    const column = index % 4;
    const row = Math.floor(index / 4);
    fk.update(root, {
      Size: scaleSize(cardWidth, cardHeight, gridWidth, contentHeight),
      Position: scalePosition(column * 202, row * 167, gridWidth, contentHeight),
    });
  }

  function setQuantity(nextQuantity: number): void {
    fk.update(quantity, {
      Text: String(nextQuantity),
      TextColor3: nextQuantity ? product.accent : palette.muted,
    });
    fk.update(decrease, {
      Disabled: nextQuantity === 0,
      TextColor3: nextQuantity ? palette.text : palette.muted,
    });
  }

  function renderQuantity(state: CartState): void {
    setQuantity(state.quantities.get(product.sku) ?? 0);
  }

  function setVisible(visible: boolean): void {
    fk.update(root, { Visible: visible });
  }

  fk.state.observe(root, cart, renderQuantity);
  return {
    root,
    setPosition,
    setVisible,
  };
}

function createQuantityButton(text: string, position: fk.UDim2): fk.TextButtonNode {
  const button = fk.createTextButton({
    Size: scaleSize(20, 22, cardWidth, cardHeight),
    Position: position,
    BackgroundColor3: palette.raised,
    Text: text,
    TextColor3: palette.text,
    TextSize: 13,
    FontWeight: 850,
  });
  decorate(button, 7, palette.border);
  return button;
}
