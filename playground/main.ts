import './index.css';
import {
  Color3,
  Frame,
  ImageLabel,
  ScreenGui,
  ScrollingFrame,
  TextButton,
  TextLabel,
  UDim2,
  Vector2,
} from '../src';

const gui = new ScreenGui();

const background = new Frame();
background.Name = 'Background';
background.Size = UDim2.fromScale(1, 1);
background.BackgroundColor3 = Color3.fromRGB(15, 23, 42);
background.Parent = gui;

const card = new Frame();
card.Name = 'InventoryCard';
card.Size = UDim2.fromOffset(440, 520);
card.Position = UDim2.fromScale(0.5, 0.5);
card.AnchorPoint = new Vector2(0.5, 0.5);
card.BackgroundColor3 = Color3.fromRGB(30, 41, 59);
card.BorderColor3 = Color3.fromRGB(71, 85, 105);
card.BorderSizePixel = 1;
card.CornerRadius = 22;
card.ClipsDescendants = true;
card.Parent = background;

const icon = new ImageLabel();
icon.Name = 'Icon';
icon.Size = UDim2.fromOffset(64, 64);
icon.Position = UDim2.fromOffset(28, 26);
icon.Image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#2563eb"/><path d="M18 22h28v24H18z" fill="none" stroke="white" stroke-width="4"/><path d="M25 22c0-9 14-9 14 0" fill="none" stroke="white" stroke-width="4"/></svg>')}`;
icon.AltText = 'Inventory';
icon.Parent = card;

const title = new TextLabel();
title.Name = 'Title';
title.Size = UDim2.fromOffset(280, 38);
title.Position = UDim2.fromOffset(108, 27);
title.Text = 'Inventory';
title.TextColor3 = Color3.fromRGB(248, 250, 252);
title.TextSize = 28;
title.FontWeight = 750;
title.TextXAlignment = 'Left';
title.Parent = card;

const subtitle = new TextLabel();
subtitle.Size = UDim2.fromOffset(280, 24);
subtitle.Position = UDim2.fromOffset(108, 64);
subtitle.Text = 'Choose an item to equip';
subtitle.TextColor3 = Color3.fromRGB(148, 163, 184);
subtitle.TextSize = 14;
subtitle.TextXAlignment = 'Left';
subtitle.Parent = card;

const items = new ScrollingFrame();
items.Name = 'Items';
items.Size = UDim2.fromOffset(384, 300);
items.Position = UDim2.fromOffset(28, 116);
items.BackgroundColor3 = Color3.fromRGB(15, 23, 42);
items.BackgroundTransparency = 0.35;
items.CornerRadius = 14;
items.ScrollingDirection = 'Y';
items.Parent = card;

const itemNames = [
  'Crystal Compass',
  'Moonlit Lantern',
  'Explorer Pack',
  'Silver Key',
  'Ancient Map',
];
for (const [index, name] of itemNames.entries()) {
  const item = new TextButton();
  item.Name = name;
  item.Size = UDim2.fromOffset(352, 48);
  item.Position = UDim2.fromOffset(16, 12 + index * 56);
  item.BackgroundColor3 = Color3.fromRGB(51, 65, 85);
  item.CornerRadius = 10;
  item.Text = name;
  item.TextColor3 = Color3.fromRGB(226, 232, 240);
  item.TextSize = 15;
  item.TextXAlignment = 'Left';
  item.MouseEnter.Connect(() => {
    console.log('Mouse Enter');
    item.BackgroundColor3 = Color3.fromRGB(59, 130, 246);
  });
  item.MouseLeave.Connect(() => {
    console.log('Mouse Leave');
    item.BackgroundColor3 = Color3.fromRGB(51, 65, 85);
  });
  item.Parent = items;
}

const status = new TextLabel();
status.Name = 'Status';
status.Size = UDim2.fromOffset(250, 48);
status.Position = UDim2.fromOffset(28, 444);
status.Text = 'Nothing equipped';
status.TextColor3 = Color3.fromRGB(148, 163, 184);
status.TextSize = 14;
status.TextXAlignment = 'Left';
status.Parent = card;

const equip = new TextButton();
equip.Name = 'Equip';
equip.Size = UDim2.fromOffset(130, 48);
equip.Position = UDim2.fromOffset(282, 444);
equip.BackgroundColor3 = Color3.fromRGB(37, 99, 235);
equip.CornerRadius = 12;
equip.Text = 'Equip item';
equip.TextColor3 = Color3.fromRGB(255, 255, 255);
equip.TextSize = 15;
equip.FontWeight = 700;
equip.MouseButton1Click.Connect(() => {
  status.Text = 'Item equipped!';
  status.TextColor3 = Color3.fromRGB(74, 222, 128);
});
equip.Parent = card;

gui.Mount('#root');
