import { fk } from 'framekit';

import type { CategoryId } from '../data/categories';
import { products } from '../data/products';
import { createLabel } from '../shared/label';
import { scalePosition, scaleSize } from '../shared/layout';
import { createPanel } from '../shared/panel';
import { palette } from '../shared/theme';
import { selectedCategory } from '../state/catalog';
import { createProductCard } from './product-card';

const deckWidth = 1200;
const deckHeight = 760;
const panelWidth = 840;
const panelHeight = 578;
const viewportWidth = 808;
const viewportHeight = 508;
const cardHeight = 155;
const rowGap = 12;
const gridPadding = 4;

export const productCatalog = createPanel(
  'ProductCatalog',
  scaleSize(panelWidth, panelHeight, deckWidth, deckHeight),
  scalePosition(20, 164, deckWidth, deckHeight),
);
fk.append(
  productCatalog,
  createLabel({
    text: 'PRODUCTS',
    size: scaleSize(240, 20, panelWidth, panelHeight),
    position: scalePosition(16, 14, panelWidth, panelHeight),
    textSize: 11,
    weight: 850,
  }),
);
const resultCount = createLabel({
  text: '',
  size: scaleSize(300, 20, panelWidth, panelHeight),
  position: scalePosition(524, 14, panelWidth, panelHeight),
  textSize: 8,
  color: palette.muted,
  xAlignment: 'Right',
});
fk.append(productCatalog, resultCount);
fk.append(
  productCatalog,
  createLabel({
    text: 'Top-rated picks with free delivery',
    size: scaleSize(400, 16, panelWidth, panelHeight),
    position: scalePosition(16, 34, panelWidth, panelHeight),
    textSize: 8,
    color: palette.muted,
  }),
);

const scroller = fk.createScrollingFrame({
  Name: 'ProductGrid',
  Size: scaleSize(viewportWidth, viewportHeight, panelWidth, panelHeight),
  Position: scalePosition(16, 56, panelWidth, panelHeight),
  BackgroundTransparency: 1,
  ScrollingDirection: 'Y',
});
const content = fk.createFrame({
  Name: 'ProductGridContent',
  Size: fk.udim2FromScale(1, 1),
  BackgroundTransparency: 1,
});
fk.append(
  content,
  fk.createUIPadding({
    PaddingTop: fk.udim(0, gridPadding),
    PaddingRight: fk.udim(0, gridPadding),
    PaddingBottom: fk.udim(0, gridPadding),
    PaddingLeft: fk.udim(0, gridPadding),
  }),
);
const cards = new Map(
  products.map((product) => {
    const card = createProductCard(product);
    fk.append(content, card.root);
    return [product.sku, card] as const;
  }),
);
fk.append(
  content,
  fk.createUIListLayout({
    FillDirection: 'Horizontal',
    Padding: fk.udim(0, rowGap),
    SortOrder: 'LayoutOrder',
    Wraps: true,
  }),
);
fk.append(scroller, content);
fk.append(productCatalog, scroller);

function showCategory(category: CategoryId): void {
  const visibleProducts =
    category === 'featured'
      ? products
      : products.filter((product) => product.category === category);
  const rowCount = Math.ceil(visibleProducts.length / 4);
  const gridHeight = Math.max(
    viewportHeight - gridPadding * 2,
    rowCount * cardHeight + Math.max(0, rowCount - 1) * rowGap,
  );
  const contentHeight = gridHeight + gridPadding * 2;
  const visibleSkus = new Set(visibleProducts.map((product) => product.sku));
  for (const product of products) cards.get(product.sku)!.setVisible(visibleSkus.has(product.sku));
  for (const [index, product] of visibleProducts.entries()) {
    cards.get(product.sku)!.setPosition(index, gridHeight);
  }
  fk.update(content, { Size: fk.udim2FromScale(1, contentHeight / viewportHeight) });
  fk.update(resultCount, {
    Text: `${visibleProducts.length} ${visibleProducts.length === 1 ? 'RESULT' : 'RESULTS'}`,
  });
  fk.scrollTo(scroller, { X: 0, Y: 0 });
}

fk.state.observe(productCatalog, selectedCategory, showCategory);
