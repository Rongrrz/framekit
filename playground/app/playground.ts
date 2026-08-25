import { fk } from 'framekit';

import { cartSidebar } from '../components/cart';
import { categoryBar } from '../components/categories';
import { header } from '../components/header';
import { productCatalog } from '../components/product-catalog';
import { decorate } from '../shared/decorate';
import { palette } from '../shared/theme';

export const playground = fk.createScreenGui({ DisplayOrder: 10 });

export const background = fk.createFrame({
  Name: 'StoreBackground',
  Size: fk.udim2FromScale(1, 1),
  BackgroundColor3: palette.void,
  ClipsDescendants: true,
});

export const storefront = fk.createFrame({
  Name: 'Storefront',
  Size: fk.udim2(1, -72, 1, -72),
  Position: fk.udim2(0.5, 0, 0.5, 18),
  AnchorPoint: fk.vector2(0.5, 0.5),
  BackgroundColor3: palette.canvas,
  BackgroundTransparency: 0.03,
  ClipsDescendants: true,
});

decorate(storefront, 28, palette.border, 2);
fk.append(storefront, header);
fk.append(storefront, categoryBar);
fk.append(storefront, productCatalog);
fk.append(storefront, cartSidebar);
fk.append(background, storefront);
fk.append(playground, background);

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
if (reduceMotion) {
  fk.update(storefront, {
    Size: fk.udim2(1, -24, 1, -24),
    Position: fk.udim2FromScale(0.5, 0.5),
  });
} else {
  const entrance = fk.createMotion(storefront, { tension: 190, friction: 20 });
  entrance.spring({
    Size: fk.udim2(1, -24, 1, -24),
    Position: fk.udim2FromScale(0.5, 0.5),
  });
}
