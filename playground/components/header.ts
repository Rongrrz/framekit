import { fk } from 'framekit';

import { decorate } from '../shared/decorate';
import { createLabel } from '../shared/label';
import { scalePosition, scaleSize } from '../shared/layout';
import { palette } from '../shared/theme';
import { cart, type CartState } from '../state/cart';
import { createStatPill } from './stat-pill';

const deckWidth = 1200;
const deckHeight = 760;
const headerWidth = 1160;
const headerHeight = 70;

export const header = fk.createFrame({
  Name: 'Header',
  Size: scaleSize(headerWidth, headerHeight, deckWidth, deckHeight),
  Position: scalePosition(20, 18, deckWidth, deckHeight),
  BackgroundColor3: palette.panel,
  BackgroundTransparency: 0.08,
});
decorate(header, 20);

const brandMark = fk.createTextLabel({
  Name: 'BrandMark',
  Size: scaleSize(46, 46, headerWidth, headerHeight),
  Position: scalePosition(14, 12, headerWidth, headerHeight),
  BackgroundColor3: palette.coral,
  Text: 'L',
  TextColor3: palette.panel,
  TextSize: 24,
  FontWeight: 900,
});
decorate(brandMark, 14, palette.coral);
fk.append(header, brandMark);
fk.append(
  header,
  createLabel({
    text: 'LUMA MARKET',
    size: fk.udim2FromOffset(270, 28),
    position: scalePosition(74, 10, headerWidth, headerHeight),
    textSize: 20,
    weight: 850,
  }),
);
fk.append(
  header,
  createLabel({
    text: 'CURATED GOODS  /  DELIVERED BRIGHT',
    size: fk.udim2FromOffset(230, 20),
    position: scalePosition(74, 40, headerWidth, headerHeight),
    textSize: 10,
    color: palette.muted,
  }),
);

const promotion = fk.createTextLabel({
  Name: 'WeekendOffer',
  Size: scaleSize(370, 38, headerWidth, headerHeight),
  Position: scalePosition(350, 16, headerWidth, headerHeight),
  BackgroundColor3: palette.raised,
  Text: 'WEEKEND DROP  ·  20% OFF CURATED TECH',
  TextColor3: palette.lilac,
  TextSize: 10,
  FontWeight: 750,
});
decorate(promotion, 19, palette.lilac);
fk.append(header, promotion);

const shipping = createStatPill({
  text: '♧  FREE SHIP',
  size: scaleSize(128, 34, headerWidth, headerHeight),
  accent: palette.mint,
  textSize: 10,
});
fk.update(shipping, { Position: scalePosition(738, 18, headerWidth, headerHeight) });
fk.append(header, shipping);

const bag = createStatPill({
  text: formatBag(0, 0),
  size: scaleSize(170, 34, headerWidth, headerHeight),
  accent: palette.coral,
  textSize: 10,
});
fk.update(bag, { Position: scalePosition(880, 18, headerWidth, headerHeight) });
fk.append(header, bag);

const bagPulse = fk.createTween(bag, fk.tweenInfo(0.18, 'Back', 'Out', 0, true), {
  Size: scaleSize(178, 38, headerWidth, headerHeight),
  Position: scalePosition(876, 16, headerWidth, headerHeight),
  BackgroundTransparency: 0.66,
});
let bagInitialized = false;

function renderBag({ itemCount, total }: CartState): void {
  fk.update(bag, { Text: formatBag(total, itemCount) });
  if (bagInitialized) bagPulse.play();
  bagInitialized = true;
}

fk.state.observe(header, cart.value, renderBag);

const avatar = fk.createTextLabel({
  Name: 'Profile',
  Size: scaleSize(46, 46, headerWidth, headerHeight),
  Position: scalePosition(1098, 12, headerWidth, headerHeight),
  BackgroundColor3: palette.lilac,
  Text: 'M',
  TextColor3: palette.panel,
  TextSize: 17,
  FontWeight: 850,
});
decorate(avatar, 23, palette.lilac);
fk.append(header, avatar);

function formatBag(total: number, itemCount: number): string {
  return `BAG ${itemCount}  ·  $${total}`;
}
