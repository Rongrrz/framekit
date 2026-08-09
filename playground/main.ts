import './index.css';
import {
  append,
  Color3,
  createFrame,
  createImageLabel,
  createScreenGui,
  createScrollingFrame,
  createTextButton,
  createTextLabel,
  mount,
  on,
  UDim2,
  update,
  Vector2,
} from '../src';

const gui = createScreenGui();

const background = createFrame({
  Name: 'Background',
  Size: UDim2.fromScale(1, 1),
  BackgroundColor3: Color3.fromRGB(15, 23, 42),
});
append(gui, background);

const card = createFrame({
  Name: 'InventoryCard',
  Size: UDim2.fromOffset(440, 520),
  Position: UDim2.fromScale(0.5, 0.5),
  AnchorPoint: new Vector2(0.5, 0.5),
  BackgroundColor3: Color3.fromRGB(30, 41, 59),
  BorderColor3: Color3.fromRGB(71, 85, 105),
  BorderSizePixel: 1,
  CornerRadius: 22,
  ClipsDescendants: true,
});
append(background, card);

const icon = createImageLabel({
  Name: 'Icon',
  Size: UDim2.fromOffset(64, 64),
  Position: UDim2.fromOffset(28, 26),
  Image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#2563eb"/><path d="M18 22h28v24H18z" fill="none" stroke="white" stroke-width="4"/><path d="M25 22c0-9 14-9 14 0" fill="none" stroke="white" stroke-width="4"/></svg>')}`,
  AltText: 'Inventory',
});
append(card, icon);

const title = createTextLabel({
  Name: 'Title',
  Size: UDim2.fromOffset(280, 38),
  Position: UDim2.fromOffset(108, 27),
  Text: 'Inventory',
  TextColor3: Color3.fromRGB(248, 250, 252),
  TextSize: 28,
  FontWeight: 750,
  TextXAlignment: 'Left',
});
append(card, title);

const subtitle = createTextLabel({
  Size: UDim2.fromOffset(280, 24),
  Position: UDim2.fromOffset(108, 64),
  Text: 'Scroll through your items and choose one to equip',
  TextColor3: Color3.fromRGB(148, 163, 184),
  TextSize: 14,
  TextXAlignment: 'Left',
});
append(card, subtitle);

const items = createScrollingFrame({
  Name: 'Items',
  Size: UDim2.fromOffset(384, 300),
  Position: UDim2.fromOffset(28, 116),
  BackgroundColor3: Color3.fromRGB(15, 23, 42),
  BackgroundTransparency: 0.35,
  CornerRadius: 14,
  ScrollingDirection: 'Y',
});
append(card, items);

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
for (const [index, name] of itemNames.entries()) {
  const item = createTextButton({
    Name: name,
    Size: UDim2.fromOffset(352, 48),
    Position: UDim2.fromOffset(16, 12 + index * 56),
    BackgroundColor3: Color3.fromRGB(51, 65, 85),
    CornerRadius: 10,
    Text: name,
    TextColor3: Color3.fromRGB(226, 232, 240),
    TextSize: 15,
    TextXAlignment: 'Left',
  });
  on(item, 'MouseEnter', () => {
    update(item, { BackgroundColor3: Color3.fromRGB(59, 130, 246) });
  });
  on(item, 'MouseLeave', () => {
    update(item, { BackgroundColor3: Color3.fromRGB(51, 65, 85) });
  });
  append(items, item);
}

const status = createTextLabel({
  Name: 'Status',
  Size: UDim2.fromOffset(250, 48),
  Position: UDim2.fromOffset(28, 444),
  Text: 'Nothing equipped',
  TextColor3: Color3.fromRGB(148, 163, 184),
  TextSize: 14,
  TextXAlignment: 'Left',
});
append(card, status);

const equip = createTextButton({
  Name: 'Equip',
  Size: UDim2.fromOffset(130, 48),
  Position: UDim2.fromOffset(282, 444),
  BackgroundColor3: Color3.fromRGB(37, 99, 235),
  CornerRadius: 12,
  Text: 'Equip item',
  TextColor3: Color3.fromRGB(255, 255, 255),
  TextSize: 15,
  FontWeight: 700,
});
on(equip, 'MouseButton1Click', () => {
  update(status, {
    Text: 'Item equipped!',
    TextColor3: Color3.fromRGB(74, 222, 128),
  });
});
append(card, equip);

mount(gui, '#root');
