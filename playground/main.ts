import * as ui from '../src';

type Sector = {
  name: string;
  code: string;
  description: string;
  climate: string;
  danger: string;
  distance: string;
  reward: number;
  accent: ui.Color3;
  markerX: number;
  markerY: number;
};

const palette = {
  void: ui.color3(5, 8, 22),
  space: ui.color3(9, 14, 35),
  panel: ui.color3(16, 24, 50),
  raised: ui.color3(24, 35, 67),
  border: ui.color3(57, 76, 122),
  text: ui.color3(238, 244, 255),
  muted: ui.color3(139, 157, 198),
  cyan: ui.color3(51, 214, 255),
  purple: ui.color3(151, 93, 255),
  green: ui.color3(75, 232, 170),
  amber: ui.color3(255, 190, 75),
  red: ui.color3(255, 100, 122),
};

const sectors: Sector[] = [
  {
    name: 'Astra Bloom',
    code: 'AB-07',
    description: 'A living nebula where crystalline gardens grow along the hulls of old ships.',
    climate: 'Ion spring',
    danger: 'Low',
    distance: '18.4 LY',
    reward: 480,
    accent: palette.cyan,
    markerX: 82,
    markerY: 78,
  },
  {
    name: 'Ember Crown',
    code: 'EC-19',
    description: 'A ring of volcanic moons orbiting a silent red giant and its royal ruins.',
    climate: 'Solar storm',
    danger: 'Severe',
    distance: '42.8 LY',
    reward: 1280,
    accent: palette.red,
    markerX: 397,
    markerY: 88,
  },
  {
    name: 'Velvet Relay',
    code: 'VR-03',
    description: 'An abandoned communications lattice still broadcasting songs from nowhere.',
    climate: 'Deep vacuum',
    danger: 'Medium',
    distance: '27.1 LY',
    reward: 760,
    accent: palette.purple,
    markerX: 431,
    markerY: 252,
  },
  {
    name: 'Mosslight',
    code: 'ML-22',
    description: 'A forest moon illuminated by bioluminescent rivers and gentle sky-whales.',
    climate: 'Warm rain',
    danger: 'Low',
    distance: '11.6 LY',
    reward: 360,
    accent: palette.green,
    markerX: 90,
    markerY: 274,
  },
  {
    name: 'Golden Wake',
    code: 'GW-88',
    description: 'A migrating field of ancient solar sails carrying a city through open space.',
    climate: 'Radiant drift',
    danger: 'High',
    distance: '35.0 LY',
    reward: 990,
    accent: palette.amber,
    markerX: 272,
    markerY: 38,
  },
];

const planetImage = new URL('./assets/planet.jpg', import.meta.url).href;
const crestImage = new URL('./assets/crest.png', import.meta.url).href;

function decorate(node: ui.GuiNode, radius = 16, stroke = palette.border, thickness = 1): void {
  ui.append(node, ui.createUICorner({ CornerRadius: radius }));
  ui.append(node, ui.createUIStroke({ Color: stroke, Thickness: thickness }));
}

function createLabel(
  text: string,
  size: ReturnType<typeof ui.udim2FromOffset>,
  position: ReturnType<typeof ui.udim2FromOffset>,
  textSize = 14,
  color = palette.text,
) {
  return ui.createTextLabel({
    Size: size,
    Position: position,
    BackgroundTransparency: 1,
    Text: text,
    TextColor3: color,
    TextSize: textSize,
    TextXAlignment: 'Left',
  });
}

function createPill(text: string, width: number, accent: ui.Color3) {
  const pill = ui.createTextLabel({
    Size: ui.udim2FromOffset(width, 34),
    BackgroundColor3: accent,
    BackgroundTransparency: 0.82,
    Text: text,
    TextColor3: accent,
    TextSize: 12,
    FontWeight: 750,
  });
  decorate(pill, 17, accent);
  return pill;
}

function attachHover(button: ui.TextButtonNode, idle: ui.Color3, hover: ui.Color3): void {
  ui.on(button, 'MouseEnter', () => ui.update(button, { BackgroundColor3: hover }));
  ui.on(button, 'MouseLeave', () => ui.update(button, { BackgroundColor3: idle }));
}

const gui = ui.createScreenGui({ DisplayOrder: 10 });

const background = ui.createFrame({
  Name: 'DeepSpace',
  Size: ui.udim2FromScale(1, 1),
  BackgroundColor3: palette.void,
  ClipsDescendants: true,
});
ui.append(gui, background);

let starSeed = 8042;
const random = (): number => {
  starSeed = (starSeed * 1664525 + 1013904223) % 4294967296;
  return starSeed / 4294967296;
};

for (let index = 0; index < 96; index += 1) {
  const diameter = 1 + Math.floor(random() * 3);
  const star = ui.createFrame({
    Name: `Star${index}`,
    Size: ui.udim2FromOffset(diameter, diameter),
    Position: ui.udim2FromScale(random(), random()),
    AnchorPoint: ui.vector2(0.5, 0.5),
    BackgroundColor3: index % 9 === 0 ? palette.cyan : palette.text,
    BackgroundTransparency: 0.25 + random() * 0.6,
    ZIndex: 1,
  });
  ui.append(star, ui.createUICorner({ CornerRadius: diameter }));
  ui.append(background, star);
}

const shell = ui.createFrame({
  Name: 'CommandDeck',
  Size: ui.udim2FromOffset(1200, 760),
  Position: ui.udim2FromScale(0.5, 0.5),
  AnchorPoint: ui.vector2(0.5, 0.5),
  BackgroundColor3: palette.space,
  BackgroundTransparency: 0.08,
  ClipsDescendants: true,
  ZIndex: 2,
});
decorate(shell, 28, ui.color3(77, 104, 169), 2);
ui.append(background, shell);

const header = ui.createFrame({
  Name: 'Header',
  Size: ui.udim2FromOffset(1160, 70),
  Position: ui.udim2FromOffset(20, 18),
  BackgroundColor3: palette.panel,
  BackgroundTransparency: 0.08,
});
decorate(header, 20);
ui.append(shell, header);

const crest = ui.createImageLabel({
  Name: 'Crest',
  Size: ui.udim2FromOffset(46, 46),
  Position: ui.udim2FromOffset(14, 12),
  Image: crestImage,
  AltText: 'Nebula Dispatch crest',
  ScaleType: 'Fit',
});
ui.append(header, crest);

const brand = createLabel(
  'NEBULA DISPATCH',
  ui.udim2FromOffset(270, 28),
  ui.udim2FromOffset(74, 10),
  20,
);
ui.update(brand, { FontWeight: 850 });
ui.append(header, brand);

const subBrand = createLabel(
  'INTERSTELLAR COURIER COMMAND  /  SHIFT 07',
  ui.udim2FromOffset(370, 20),
  ui.udim2FromOffset(74, 40),
  10,
  palette.muted,
);
ui.append(header, subBrand);

const headerPills = ui.createFrame({
  Name: 'HeaderStats',
  Size: ui.udim2FromOffset(438, 38),
  Position: ui.udim2FromOffset(708, 16),
  BackgroundTransparency: 1,
});
ui.append(header, headerPills);

let credits = 4280;
let completed = 12;
const creditsPill = createPill(`◈ ${credits.toLocaleString()} CREDITS`, 154, palette.cyan);
const fuelPill = createPill('◉  82% FUEL', 126, palette.green);
const rankPill = createPill('★  RANK 14', 126, palette.purple);
ui.append(headerPills, creditsPill);
ui.append(headerPills, fuelPill);
ui.append(headerPills, rankPill);
ui.append(
  headerPills,
  ui.createUIListLayout({ FillDirection: 'Horizontal', Padding: ui.udim(0, 10) }),
);

const leftPanel = ui.createFrame({
  Name: 'Navigation',
  Size: ui.udim2FromOffset(220, 634),
  Position: ui.udim2FromOffset(20, 108),
  BackgroundColor3: palette.panel,
  BackgroundTransparency: 0.08,
});
decorate(leftPanel, 20);
ui.append(shell, leftPanel);

const captainCard = ui.createFrame({
  Size: ui.udim2FromOffset(190, 92),
  Position: ui.udim2FromOffset(15, 16),
  BackgroundColor3: palette.raised,
  BackgroundTransparency: 0.18,
});
decorate(captainCard, 14, ui.color3(67, 91, 143));
ui.append(leftPanel, captainCard);

const avatar = ui.createImageLabel({
  Size: ui.udim2FromOffset(58, 58),
  Position: ui.udim2FromOffset(12, 17),
  Image: crestImage,
  AltText: 'Captain Nova',
});
ui.append(captainCard, avatar);

ui.append(
  captainCard,
  createLabel('CAPTAIN NOVA', ui.udim2FromOffset(104, 24), ui.udim2FromOffset(80, 19), 13),
);
ui.append(
  captainCard,
  createLabel(
    'Courier • Online',
    ui.udim2FromOffset(104, 20),
    ui.udim2FromOffset(80, 45),
    10,
    palette.green,
  ),
);

const navTitle = createLabel(
  'COMMAND MODULES',
  ui.udim2FromOffset(190, 20),
  ui.udim2FromOffset(16, 126),
  10,
  palette.muted,
);
ui.append(leftPanel, navTitle);

const navList = ui.createFrame({
  Size: ui.udim2FromOffset(190, 238),
  Position: ui.udim2FromOffset(15, 154),
  BackgroundTransparency: 1,
});
ui.append(leftPanel, navList);

const deckNotice = ui.createTextLabel({
  Size: ui.udim2FromOffset(188, 102),
  Position: ui.udim2FromOffset(16, 510),
  BackgroundColor3: palette.purple,
  BackgroundTransparency: 0.78,
  Text: '✦  COMET FESTIVAL\nBegins in 04:18:22\nDouble courier reputation',
  TextColor3: ui.color3(218, 202, 255),
  TextSize: 11,
  TextWrapped: true,
  TextXAlignment: 'Center',
  TextYAlignment: 'Center',
});
decorate(deckNotice, 14, palette.purple);
ui.append(leftPanel, deckNotice);

const modeTitle = createLabel(
  'Star Map',
  ui.udim2FromOffset(420, 24),
  ui.udim2FromOffset(270, 102),
  11,
  palette.cyan,
);
ui.update(modeTitle, { FontWeight: 800 });
ui.append(shell, modeTitle);

const navItems = [
  '◎  STAR MAP',
  '▤  EXPEDITIONS',
  '◫  CARGO HOLD',
  '⌁  CREW COMMS',
  '⚙  SHIP SYSTEMS',
];
for (const [index, name] of navItems.entries()) {
  const active = index === 0;
  const navButton = ui.createTextButton({
    Name: name,
    Size: ui.udim2FromOffset(190, 40),
    BackgroundColor3: active ? palette.cyan : palette.raised,
    BackgroundTransparency: active ? 0.78 : 0.45,
    Text: name,
    TextColor3: active ? palette.cyan : palette.muted,
    TextSize: 11,
    FontWeight: active ? 800 : 650,
    TextXAlignment: 'Left',
  });
  ui.append(navButton, ui.createUICorner({ CornerRadius: 10 }));
  attachHover(navButton, active ? palette.cyan : palette.raised, ui.color3(44, 61, 108));
  ui.on(navButton, 'MouseButton1Click', () => {
    ui.update(modeTitle, { Text: `${name.replace(/^[^ ]+\s+/, '')}  /  MODULE READY` });
  });
  ui.append(navList, navButton);
}
ui.append(navList, ui.createUIListLayout({ Padding: ui.udim(0, 8) }));

const mapPanel = ui.createFrame({
  Name: 'StarMap',
  Size: ui.udim2FromOffset(620, 394),
  Position: ui.udim2FromOffset(260, 132),
  BackgroundColor3: ui.color3(10, 17, 43),
  BackgroundTransparency: 0.05,
  ClipsDescendants: true,
});
decorate(mapPanel, 20, ui.color3(50, 75, 130));
ui.append(shell, mapPanel);

const planet = ui.createImageButton({
  Name: 'OrbitCore',
  Size: ui.udim2FromOffset(360, 360),
  Position: ui.udim2FromOffset(130, 18),
  Image: planetImage,
  AltText: 'Interactive orbital map',
  ScaleType: 'Fit',
});
ui.append(mapPanel, planet);

const mapKicker = createPill('LIVE ORBITAL FEED', 132, palette.green);
ui.update(mapKicker, { Position: ui.udim2FromOffset(18, 16), Size: ui.udim2FromOffset(132, 28) });
ui.append(mapPanel, mapKicker);

const zoomReadout = createLabel(
  'ZOOM  44%\nGRID  NX-18',
  ui.udim2FromOffset(110, 44),
  ui.udim2FromOffset(492, 330),
  9,
  palette.muted,
);
ui.update(zoomReadout, { TextXAlignment: 'Right', TextYAlignment: 'Bottom' });
ui.append(mapPanel, zoomReadout);

const detailsPanel = ui.createFrame({
  Name: 'SectorDetails',
  Size: ui.udim2FromOffset(280, 634),
  Position: ui.udim2FromOffset(900, 108),
  BackgroundColor3: palette.panel,
  BackgroundTransparency: 0.08,
});
decorate(detailsPanel, 20);
ui.append(shell, detailsPanel);

const detailKicker = createLabel(
  'SELECTED DESTINATION',
  ui.udim2FromOffset(246, 18),
  ui.udim2FromOffset(18, 18),
  9,
  palette.muted,
);
ui.append(detailsPanel, detailKicker);

const detailTitle = createLabel(
  '',
  ui.udim2FromOffset(246, 34),
  ui.udim2FromOffset(18, 42),
  23,
  palette.text,
);
ui.update(detailTitle, { FontWeight: 850 });
ui.append(detailsPanel, detailTitle);

const detailCode = createLabel(
  '',
  ui.udim2FromOffset(246, 20),
  ui.udim2FromOffset(18, 78),
  11,
  palette.cyan,
);
ui.append(detailsPanel, detailCode);

const preview = ui.createImageLabel({
  Size: ui.udim2FromOffset(244, 104),
  Position: ui.udim2FromOffset(18, 108),
  BackgroundColor3: palette.raised,
  BackgroundTransparency: 0.35,
  Image: planetImage,
  AltText: 'Destination scan',
  ScaleType: 'Crop',
});
decorate(preview, 14, ui.color3(69, 90, 144));
ui.append(detailsPanel, preview);

const detailDescription = ui.createTextLabel({
  Size: ui.udim2FromOffset(244, 58),
  Position: ui.udim2FromOffset(18, 224),
  BackgroundTransparency: 1,
  Text: '',
  TextColor3: palette.muted,
  TextSize: 11,
  TextWrapped: true,
  TextXAlignment: 'Left',
  TextYAlignment: 'Top',
});
ui.append(detailsPanel, detailDescription);

const statGrid = ui.createFrame({
  Size: ui.udim2FromOffset(244, 112),
  Position: ui.udim2FromOffset(18, 292),
  BackgroundTransparency: 1,
});
ui.append(detailsPanel, statGrid);

const climateValue = createLabel('', ui.udim2FromOffset(116, 48), ui.udim2FromOffset(0, 0), 12);
const dangerValue = createLabel('', ui.udim2FromOffset(116, 48), ui.udim2FromOffset(128, 0), 12);
const distanceValue = createLabel('', ui.udim2FromOffset(116, 48), ui.udim2FromOffset(0, 60), 12);
const rewardValue = createLabel('', ui.udim2FromOffset(116, 48), ui.udim2FromOffset(128, 60), 12);
for (const card of [climateValue, dangerValue, distanceValue, rewardValue]) {
  ui.update(card, {
    BackgroundColor3: palette.raised,
    BackgroundTransparency: 0.28,
    TextXAlignment: 'Center',
  });
  decorate(card, 10, ui.color3(54, 72, 116));
  ui.append(statGrid, card);
}

const launchButton = ui.createTextButton({
  Name: 'Launch',
  Size: ui.udim2FromOffset(244, 48),
  Position: ui.udim2FromOffset(18, 418),
  BackgroundColor3: palette.cyan,
  Text: 'LAUNCH COURIER  →',
  TextColor3: palette.void,
  TextSize: 13,
  FontWeight: 850,
});
decorate(launchButton, 14, ui.color3(138, 240, 255), 2);
ui.append(detailsPanel, launchButton);

const rerouteButton = ui.createTextButton({
  Name: 'Reroute',
  Size: ui.udim2FromOffset(244, 38),
  Position: ui.udim2FromOffset(18, 476),
  BackgroundColor3: palette.raised,
  BackgroundTransparency: 0.25,
  Text: 'SURPRISE ME',
  TextColor3: palette.muted,
  TextSize: 11,
  FontWeight: 750,
});
decorate(rerouteButton, 12, palette.border);
attachHover(rerouteButton, palette.raised, ui.color3(47, 61, 108));
ui.append(detailsPanel, rerouteButton);

const launchStatus = createLabel(
  'FLIGHT COMPUTER READY',
  ui.udim2FromOffset(244, 24),
  ui.udim2FromOffset(18, 522),
  9,
  palette.green,
);
ui.update(launchStatus, { TextXAlignment: 'Center' });
ui.append(detailsPanel, launchStatus);

const markerRecords: Array<{ sector: Sector; button: ui.TextButtonNode; stroke: ui.UIStrokeNode }> =
  [];
const sectorSelected = ui.createSignal<[Sector]>();
let selectedSector = sectors[0]!;

for (const sector of sectors) {
  const marker = ui.createTextButton({
    Name: sector.code,
    Size: ui.udim2FromOffset(112, 34),
    Position: ui.udim2FromOffset(sector.markerX, sector.markerY),
    BackgroundColor3: palette.raised,
    BackgroundTransparency: 0.12,
    Text: `●  ${sector.code}`,
    TextColor3: sector.accent,
    TextSize: 10,
    FontWeight: 800,
  });
  ui.append(marker, ui.createUICorner({ CornerRadius: 17 }));
  const stroke = ui.createUIStroke({ Color: sector.accent, Thickness: 1, Transparency: 0.35 });
  ui.append(marker, stroke);
  attachHover(marker, palette.raised, ui.color3(44, 58, 102));
  ui.on(marker, 'MouseButton1Click', () => sectorSelected.emit(sector));
  markerRecords.push({ sector, button: marker, stroke });
  ui.append(mapPanel, marker);
}

sectorSelected.subscribe((sector) => {
  selectedSector = sector;
  ui.update(detailTitle, { Text: sector.name });
  ui.update(detailCode, { Text: `${sector.code}  •  PRIORITY ROUTE` });
  ui.update(detailDescription, { Text: sector.description });
  ui.update(climateValue, { Text: `CLIMATE\n${sector.climate}`, TextColor3: sector.accent });
  ui.update(dangerValue, {
    Text: `DANGER\n${sector.danger}`,
    TextColor3: sector.danger === 'Severe' ? palette.red : sector.accent,
  });
  ui.update(distanceValue, { Text: `DISTANCE\n${sector.distance}` });
  ui.update(rewardValue, { Text: `REWARD\n◈ ${sector.reward}`, TextColor3: palette.amber });
  ui.update(launchButton, { BackgroundColor3: sector.accent });
  ui.update(modeTitle, { Text: `Star Map  /  ${sector.name.toUpperCase()}` });

  for (const marker of markerRecords) {
    const selected = marker.sector === sector;
    ui.update(marker.button, {
      BackgroundColor3: selected ? marker.sector.accent : palette.raised,
      BackgroundTransparency: selected ? 0.62 : 0.12,
      TextColor3: selected ? palette.text : marker.sector.accent,
    });
    ui.update(marker.stroke, { Thickness: selected ? 2 : 1, Transparency: selected ? 0 : 0.35 });
  }
});

ui.on(planet, 'MouseButton1Click', () => {
  const current = sectors.indexOf(selectedSector);
  sectorSelected.emit(sectors[(current + 1) % sectors.length]!);
});

const expeditionsPanel = ui.createFrame({
  Name: 'Expeditions',
  Size: ui.udim2FromOffset(620, 196),
  Position: ui.udim2FromOffset(260, 546),
  BackgroundColor3: palette.panel,
  BackgroundTransparency: 0.08,
});
decorate(expeditionsPanel, 20);
ui.append(shell, expeditionsPanel);

ui.append(
  expeditionsPanel,
  createLabel(
    'ACTIVE EXPEDITIONS',
    ui.udim2FromOffset(220, 22),
    ui.udim2FromOffset(18, 14),
    11,
    palette.text,
  ),
);

const completionLabel = createLabel(
  `${completed} COMPLETED`,
  ui.udim2FromOffset(160, 22),
  ui.udim2FromOffset(440, 14),
  9,
  palette.green,
);
ui.update(completionLabel, { TextXAlignment: 'Right' });
ui.append(expeditionsPanel, completionLabel);

const missionScroller = ui.createScrollingFrame({
  Size: ui.udim2FromOffset(586, 132),
  Position: ui.udim2FromOffset(17, 48),
  BackgroundTransparency: 1,
  ScrollingDirection: 'X',
});
ui.append(expeditionsPanel, missionScroller);

const missions = [
  ['GLASS HORIZON', 'Deliver 3 prism cores', '72%', palette.cyan],
  ['CHOIR OF DUST', 'Decode the lost refrain', '41%', palette.purple],
  ['GREEN COMET', 'Escort a seed ark', '88%', palette.green],
  ['CROWN RUN', 'Outpace the solar tide', '19%', palette.red],
  ['GILDED MAIL', 'Find the drifting city', '54%', palette.amber],
] as const;

for (const [name, objective, progress, accent] of missions) {
  const card = ui.createFrame({
    Size: ui.udim2FromOffset(184, 124),
    BackgroundColor3: palette.raised,
    BackgroundTransparency: 0.18,
  });
  decorate(card, 14, ui.color3(55, 74, 120));
  ui.append(
    card,
    createLabel(name, ui.udim2FromOffset(154, 20), ui.udim2FromOffset(14, 14), 11, accent),
  );
  ui.append(
    card,
    createLabel(
      objective,
      ui.udim2FromOffset(154, 34),
      ui.udim2FromOffset(14, 40),
      10,
      palette.muted,
    ),
  );
  const progressTrack = ui.createFrame({
    Size: ui.udim2FromOffset(154, 6),
    Position: ui.udim2FromOffset(14, 84),
    BackgroundColor3: ui.color3(43, 55, 92),
  });
  ui.append(progressTrack, ui.createUICorner({ CornerRadius: 3 }));
  ui.append(card, progressTrack);
  const progressFill = ui.createFrame({
    Size: ui.udim2(Number.parseInt(progress, 10) / 100, 0, 1, 0),
    BackgroundColor3: accent,
  });
  ui.append(progressFill, ui.createUICorner({ CornerRadius: 3 }));
  ui.append(progressTrack, progressFill);
  ui.append(
    card,
    createLabel(progress, ui.udim2FromOffset(154, 18), ui.udim2FromOffset(14, 96), 9, accent),
  );
  ui.append(missionScroller, card);
}
ui.append(
  missionScroller,
  ui.createUIListLayout({ FillDirection: 'Horizontal', Padding: ui.udim(0, 12) }),
);

const activityTitle = createLabel(
  'COURIER ACTIVITY',
  ui.udim2FromOffset(244, 20),
  ui.udim2FromOffset(18, 554),
  9,
  palette.muted,
);
ui.update(activityTitle, { TextXAlignment: 'Center' });
ui.append(detailsPanel, activityTitle);

const activityFeed = ui.createScrollingFrame({
  Name: 'ActivityFeed',
  Size: ui.udim2FromOffset(208, 48),
  Position: ui.udim2FromOffset(36, 580),
  BackgroundTransparency: 1,
  ScrollingDirection: 'Y',
});
ui.append(detailsPanel, activityFeed);

const addLog = (message: string, accent: ui.Color3): void => {
  const entry = ui.createTextLabel({
    Size: ui.udim2FromOffset(204, 30),
    BackgroundColor3: accent,
    BackgroundTransparency: 0.88,
    Text: message,
    TextColor3: accent,
    TextSize: 9,
    TextXAlignment: 'Center',
  });
  ui.append(entry, ui.createUICorner({ CornerRadius: 8 }));
  ui.append(activityFeed, entry);
};

addLog('SYSTEMS NOMINAL', palette.green);
addLog('ROUTE NETWORK ONLINE', palette.cyan);
ui.append(activityFeed, ui.createUIListLayout({ Padding: ui.udim(0, 6) }));

ui.on(launchButton, 'MouseButton1Click', () => {
  credits += selectedSector.reward;
  completed += 1;
  ui.update(creditsPill, { Text: `◈ ${credits.toLocaleString()} CREDITS` });
  ui.update(completionLabel, { Text: `${completed} COMPLETED` });
  ui.update(launchStatus, {
    Text: `COURIER LAUNCHED TO ${selectedSector.code}`,
    TextColor3: selectedSector.accent,
  });
  ui.update(launchButton, { Text: 'COURIER IN FLIGHT  ✓' });
  addLog(`LAUNCHED  •  ${selectedSector.code}`, selectedSector.accent);
});

let surpriseIndex = 0;
ui.on(rerouteButton, 'MouseButton1Click', () => {
  surpriseIndex = (surpriseIndex + 2) % sectors.length;
  sectorSelected.emit(sectors[surpriseIndex]!);
  ui.update(launchStatus, { Text: 'SURPRISE ROUTE CALCULATED', TextColor3: palette.purple });
  ui.update(launchButton, { Text: 'LAUNCH COURIER  →' });
});

sectorSelected.emit(sectors[0]!);
ui.mount(gui, '#root');
