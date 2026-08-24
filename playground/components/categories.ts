import { fk } from 'framekit';

import { categories } from '../data/categories';
import { createLabel } from '../shared/label';
import { scalePosition, scaleSize } from '../shared/layout';
import { createPanel } from '../shared/panel';
import { palette } from '../shared/theme';
import { createCategoryButton } from './category-button';

const deckWidth = 1200;
const deckHeight = 760;
const panelWidth = 1160;
const panelHeight = 48;
const listPadding = 10;

export const categoryBar = createPanel(
  'Categories',
  scaleSize(panelWidth, panelHeight, deckWidth, deckHeight),
  scalePosition(20, 98, deckWidth, deckHeight),
);
fk.append(
  categoryBar,
  createLabel({
    text: 'BROWSE',
    size: scaleSize(78, 20, panelWidth, panelHeight),
    position: scalePosition(18, 14, panelWidth, panelHeight),
    textSize: 9,
    color: palette.muted,
  }),
);

const list = fk.createFrame({
  Name: 'CategoryList',
  Size: scaleSize(1038, 36, panelWidth, panelHeight),
  Position: scalePosition(104, 6, panelWidth, panelHeight),
  BackgroundTransparency: 1,
});
fk.append(
  list,
  fk.createUIPadding({
    PaddingRight: fk.udim(0, listPadding),
    PaddingLeft: fk.udim(0, listPadding),
  }),
);
for (const category of categories) {
  fk.append(list, createCategoryButton(category));
}
fk.append(list, fk.createUIListLayout({ FillDirection: 'Horizontal', Padding: fk.udim(0, 12) }));
fk.append(categoryBar, list);
