import './index.css';
import {
  append,
  color3,
  createFrame,
  createImageLabel,
  createScreenGui,
  createScrollingFrame,
  createTextButton,
  createTextLabel,
  createUICorner,
  createUIListLayout,
  createUIStroke,
  mount,
  on,
  udim,
  udim2FromOffset,
  udim2FromScale,
  update,
  vector2,
} from '../src';

const gui = createScreenGui();

const background = createFrame({
  Name: 'Background',
  Size: udim2FromScale(1, 1),
  BackgroundColor3: color3(15, 23, 42),
});
append(gui, background);

const card = createFrame({
  Name: 'InventoryCard',
  Size: udim2FromOffset(440, 520),
  Position: udim2FromScale(0.5, 0.5),
  AnchorPoint: vector2(0.5, 0.5),
  BackgroundColor3: color3(30, 41, 59),
  ClipsDescendants: true,
});
append(background, card);
append(card, createUICorner({ CornerRadius: 22 }));
append(
  card,
  createUIStroke({
    Color: color3(71, 85, 105),
    Thickness: 1,
  }),
);

const icon = createImageLabel({
  Name: 'Icon',
  Size: udim2FromOffset(64, 64),
  Position: udim2FromOffset(28, 26),
  Image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#2563eb"/><path d="M18 22h28v24H18z" fill="none" stroke="white" stroke-width="4"/><path d="M25 22c0-9 14-9 14 0" fill="none" stroke="white" stroke-width="4"/></svg>')}`,
  AltText: 'Inventory',
});
append(card, icon);

const title = createTextLabel({
  Name: 'Title',
  Size: udim2FromOffset(280, 38),
  Position: udim2FromOffset(108, 27),
  Text: 'Inventory',
  TextColor3: color3(248, 250, 252),
  TextSize: 28,
  FontWeight: 750,
  TextXAlignment: 'Left',
});
append(card, title);

const subtitle = createTextLabel({
  Size: udim2FromOffset(280, 24),
  Position: udim2FromOffset(108, 64),
  Text: 'Scroll through your items and choose one to equip',
  TextColor3: color3(148, 163, 184),
  TextSize: 14,
  TextXAlignment: 'Left',
});
append(card, subtitle);

const items = createScrollingFrame({
  Name: 'Items',
  Size: udim2FromOffset(384, 300),
  Position: udim2FromOffset(28, 116),
  BackgroundColor3: color3(15, 23, 42),
  BackgroundTransparency: 0.35,
  ScrollingDirection: 'Y',
});
append(card, items);
append(items, createUICorner({ CornerRadius: 14 }));
append(
  items,
  createUIListLayout({
    Padding: udim(0, 8),
    HorizontalAlignment: 'Center',
  }),
);

const itemNames = [
  'Crystal Compass',
  'Moonlit Lantern',
  'Explorer Pack',
  'Silver Key',
  'Ancient Map',
  'Sunstone Amulet',
  'Traveler Boots',
  'Stormglass Vial',
  'Ember Torch',
  'Royal Signet',
];
for (const name of itemNames) {
  const item = createTextButton({
    Name: name,
    Size: udim2FromOffset(352, 48),
    BackgroundColor3: color3(51, 65, 85),
    Text: name,
    TextColor3: color3(226, 232, 240),
    TextSize: 15,
    TextXAlignment: 'Left',
  });
  append(item, createUICorner({ CornerRadius: 10 }));
  on(item, 'MouseEnter', () => {
    update(item, { BackgroundColor3: color3(59, 130, 246) });
  });
  on(item, 'MouseLeave', () => {
    update(item, { BackgroundColor3: color3(51, 65, 85) });
  });
  append(items, item);
}

const status = createTextLabel({
  Name: 'Status',
  Size: udim2FromOffset(250, 48),
  Position: udim2FromOffset(28, 444),
  Text: 'Nothing equipped',
  TextColor3: color3(148, 163, 184),
  TextSize: 14,
  TextXAlignment: 'Left',
});
append(card, status);

const equip = createTextButton({
  Name: 'Equip',
  Size: udim2FromOffset(130, 48),
  Position: udim2FromOffset(282, 444),
  BackgroundColor3: color3(37, 99, 235),
  Text: 'Equip item',
  TextColor3: color3(255, 255, 255),
  TextSize: 15,
  FontWeight: 700,
});
append(equip, createUICorner({ CornerRadius: 12 }));
on(equip, 'MouseButton1Click', () => {
  update(status, {
    Text: 'Item equipped!',
    TextColor3: color3(74, 222, 128),
  });
});
append(card, equip);

mount(gui, '#root');
