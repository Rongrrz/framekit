import {
  append,
  color3,
  createFrame,
  createImageButton,
  createImageLabel,
  createScreenGui,
  createScrollingFrame,
  createSignal,
  createTextButton,
  createTextLabel,
  createUICorner,
  createUIListLayout,
  createUIStroke,
  mount,
  on,
  udim,
  udim2,
  udim2FromOffset,
  udim2FromScale,
  update,
  vector2,
  type Color3,
  type GuiNode,
  type TextButtonNode,
  type UIStrokeNode,
} from '../src';

type Sector = {
  name: string;
  code: string;
  description: string;
  climate: string;
  danger: string;
  distance: string;
  reward: number;
  accent: Color3;
  markerX: number;
  markerY: number;
};

const palette = {
  void: color3(5, 8, 22),
  space: color3(9, 14, 35),
  panel: color3(16, 24, 50),
  raised: color3(24, 35, 67),
  border: color3(57, 76, 122),
  text: color3(238, 244, 255),
  muted: color3(139, 157, 198),
  cyan: color3(51, 214, 255),
  purple: color3(151, 93, 255),
  green: color3(75, 232, 170),
  amber: color3(255, 190, 75),
  red: color3(255, 100, 122),
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

function decorate(node: GuiNode, radius = 16, stroke = palette.border, thickness = 1): void {
  append(node, createUICorner({ CornerRadius: radius }));
  append(node, createUIStroke({ Color: stroke, Thickness: thickness }));
}

function createLabel(
  text: string,
  size: ReturnType<typeof udim2FromOffset>,
  position: ReturnType<typeof udim2FromOffset>,
  textSize = 14,
  color = palette.text,
) {
  return createTextLabel({
    Size: size,
    Position: position,
    BackgroundTransparency: 1,
    Text: text,
    TextColor3: color,
    TextSize: textSize,
    TextXAlignment: 'Left',
  });
}

function createPill(text: string, width: number, accent: Color3) {
  const pill = createTextLabel({
    Size: udim2FromOffset(width, 34),
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

function attachHover(button: TextButtonNode, idle: Color3, hover: Color3): void {
  on(button, 'MouseEnter', () => update(button, { BackgroundColor3: hover }));
  on(button, 'MouseLeave', () => update(button, { BackgroundColor3: idle }));
}

const gui = createScreenGui({ DisplayOrder: 10 });

const background = createFrame({
  Name: 'DeepSpace',
  Size: udim2FromScale(1, 1),
  BackgroundColor3: palette.void,
  ClipsDescendants: true,
});
append(gui, background);

let starSeed = 8042;
const random = (): number => {
  starSeed = (starSeed * 1664525 + 1013904223) % 4294967296;
  return starSeed / 4294967296;
};

for (let index = 0; index < 96; index += 1) {
  const diameter = 1 + Math.floor(random() * 3);
  const star = createFrame({
    Name: `Star${index}`,
    Size: udim2FromOffset(diameter, diameter),
    Position: udim2FromScale(random(), random()),
    AnchorPoint: vector2(0.5, 0.5),
    BackgroundColor3: index % 9 === 0 ? palette.cyan : palette.text,
    BackgroundTransparency: 0.25 + random() * 0.6,
    ZIndex: 1,
  });
  append(star, createUICorner({ CornerRadius: diameter }));
  append(background, star);
}

const shell = createFrame({
  Name: 'CommandDeck',
  Size: udim2FromOffset(1200, 760),
  Position: udim2FromScale(0.5, 0.5),
  AnchorPoint: vector2(0.5, 0.5),
  BackgroundColor3: palette.space,
  BackgroundTransparency: 0.08,
  ClipsDescendants: true,
  ZIndex: 2,
});
decorate(shell, 28, color3(77, 104, 169), 2);
append(background, shell);

const header = createFrame({
  Name: 'Header',
  Size: udim2FromOffset(1160, 70),
  Position: udim2FromOffset(20, 18),
  BackgroundColor3: palette.panel,
  BackgroundTransparency: 0.08,
});
decorate(header, 20);
append(shell, header);

const crest = createImageLabel({
  Name: 'Crest',
  Size: udim2FromOffset(46, 46),
  Position: udim2FromOffset(14, 12),
  Image: crestImage,
  AltText: 'Nebula Dispatch crest',
  ScaleType: 'Fit',
});
append(header, crest);

const brand = createLabel('NEBULA DISPATCH', udim2FromOffset(270, 28), udim2FromOffset(74, 10), 20);
update(brand, { FontWeight: 850 });
append(header, brand);

const subBrand = createLabel(
  'INTERSTELLAR COURIER COMMAND  /  SHIFT 07',
  udim2FromOffset(370, 20),
  udim2FromOffset(74, 40),
  10,
  palette.muted,
);
append(header, subBrand);

const headerPills = createFrame({
  Name: 'HeaderStats',
  Size: udim2FromOffset(438, 38),
  Position: udim2FromOffset(708, 16),
  BackgroundTransparency: 1,
});
append(header, headerPills);

let credits = 4280;
let completed = 12;
const creditsPill = createPill(`◈ ${credits.toLocaleString()} CREDITS`, 154, palette.cyan);
const fuelPill = createPill('◉  82% FUEL', 126, palette.green);
const rankPill = createPill('★  RANK 14', 126, palette.purple);
append(headerPills, creditsPill);
append(headerPills, fuelPill);
append(headerPills, rankPill);
append(headerPills, createUIListLayout({ FillDirection: 'Horizontal', Padding: udim(0, 10) }));

const leftPanel = createFrame({
  Name: 'Navigation',
  Size: udim2FromOffset(220, 634),
  Position: udim2FromOffset(20, 108),
  BackgroundColor3: palette.panel,
  BackgroundTransparency: 0.08,
});
decorate(leftPanel, 20);
append(shell, leftPanel);

const captainCard = createFrame({
  Size: udim2FromOffset(190, 92),
  Position: udim2FromOffset(15, 16),
  BackgroundColor3: palette.raised,
  BackgroundTransparency: 0.18,
});
decorate(captainCard, 14, color3(67, 91, 143));
append(leftPanel, captainCard);

const avatar = createImageLabel({
  Size: udim2FromOffset(58, 58),
  Position: udim2FromOffset(12, 17),
  Image: crestImage,
  AltText: 'Captain Nova',
});
append(captainCard, avatar);

append(
  captainCard,
  createLabel('CAPTAIN NOVA', udim2FromOffset(104, 24), udim2FromOffset(80, 19), 13),
);
append(
  captainCard,
  createLabel(
    'Courier • Online',
    udim2FromOffset(104, 20),
    udim2FromOffset(80, 45),
    10,
    palette.green,
  ),
);

const navTitle = createLabel(
  'COMMAND MODULES',
  udim2FromOffset(190, 20),
  udim2FromOffset(16, 126),
  10,
  palette.muted,
);
append(leftPanel, navTitle);

const navList = createFrame({
  Size: udim2FromOffset(190, 238),
  Position: udim2FromOffset(15, 154),
  BackgroundTransparency: 1,
});
append(leftPanel, navList);

const deckNotice = createTextLabel({
  Size: udim2FromOffset(188, 102),
  Position: udim2FromOffset(16, 510),
  BackgroundColor3: palette.purple,
  BackgroundTransparency: 0.78,
  Text: '✦  COMET FESTIVAL\nBegins in 04:18:22\nDouble courier reputation',
  TextColor3: color3(218, 202, 255),
  TextSize: 11,
  TextWrapped: true,
  TextXAlignment: 'Center',
  TextYAlignment: 'Center',
});
decorate(deckNotice, 14, palette.purple);
append(leftPanel, deckNotice);

const modeTitle = createLabel(
  'Star Map',
  udim2FromOffset(420, 24),
  udim2FromOffset(270, 102),
  11,
  palette.cyan,
);
update(modeTitle, { FontWeight: 800 });
append(shell, modeTitle);

const navItems = [
  '◎  STAR MAP',
  '▤  EXPEDITIONS',
  '◫  CARGO HOLD',
  '⌁  CREW COMMS',
  '⚙  SHIP SYSTEMS',
];
for (const [index, name] of navItems.entries()) {
  const active = index === 0;
  const navButton = createTextButton({
    Name: name,
    Size: udim2FromOffset(190, 40),
    BackgroundColor3: active ? palette.cyan : palette.raised,
    BackgroundTransparency: active ? 0.78 : 0.45,
    Text: name,
    TextColor3: active ? palette.cyan : palette.muted,
    TextSize: 11,
    FontWeight: active ? 800 : 650,
    TextXAlignment: 'Left',
  });
  append(navButton, createUICorner({ CornerRadius: 10 }));
  attachHover(navButton, active ? palette.cyan : palette.raised, color3(44, 61, 108));
  on(navButton, 'MouseButton1Click', () => {
    update(modeTitle, { Text: `${name.replace(/^[^ ]+\s+/, '')}  /  MODULE READY` });
  });
  append(navList, navButton);
}
append(navList, createUIListLayout({ Padding: udim(0, 8) }));

const mapPanel = createFrame({
  Name: 'StarMap',
  Size: udim2FromOffset(620, 394),
  Position: udim2FromOffset(260, 132),
  BackgroundColor3: color3(10, 17, 43),
  BackgroundTransparency: 0.05,
  ClipsDescendants: true,
});
decorate(mapPanel, 20, color3(50, 75, 130));
append(shell, mapPanel);

const planet = createImageButton({
  Name: 'OrbitCore',
  Size: udim2FromOffset(360, 360),
  Position: udim2FromOffset(130, 18),
  Image: planetImage,
  AltText: 'Interactive orbital map',
  ScaleType: 'Fit',
});
append(mapPanel, planet);

const mapKicker = createPill('LIVE ORBITAL FEED', 132, palette.green);
update(mapKicker, { Position: udim2FromOffset(18, 16), Size: udim2FromOffset(132, 28) });
append(mapPanel, mapKicker);

const zoomReadout = createLabel(
  'ZOOM  44%\nGRID  NX-18',
  udim2FromOffset(110, 44),
  udim2FromOffset(492, 330),
  9,
  palette.muted,
);
update(zoomReadout, { TextXAlignment: 'Right', TextYAlignment: 'Bottom' });
append(mapPanel, zoomReadout);

const detailsPanel = createFrame({
  Name: 'SectorDetails',
  Size: udim2FromOffset(280, 634),
  Position: udim2FromOffset(900, 108),
  BackgroundColor3: palette.panel,
  BackgroundTransparency: 0.08,
});
decorate(detailsPanel, 20);
append(shell, detailsPanel);

const detailKicker = createLabel(
  'SELECTED DESTINATION',
  udim2FromOffset(246, 18),
  udim2FromOffset(18, 18),
  9,
  palette.muted,
);
append(detailsPanel, detailKicker);

const detailTitle = createLabel(
  '',
  udim2FromOffset(246, 34),
  udim2FromOffset(18, 42),
  23,
  palette.text,
);
update(detailTitle, { FontWeight: 850 });
append(detailsPanel, detailTitle);

const detailCode = createLabel(
  '',
  udim2FromOffset(246, 20),
  udim2FromOffset(18, 78),
  11,
  palette.cyan,
);
append(detailsPanel, detailCode);

const preview = createImageLabel({
  Size: udim2FromOffset(244, 104),
  Position: udim2FromOffset(18, 108),
  BackgroundColor3: palette.raised,
  BackgroundTransparency: 0.35,
  Image: planetImage,
  AltText: 'Destination scan',
  ScaleType: 'Crop',
});
decorate(preview, 14, color3(69, 90, 144));
append(detailsPanel, preview);

const detailDescription = createTextLabel({
  Size: udim2FromOffset(244, 58),
  Position: udim2FromOffset(18, 224),
  BackgroundTransparency: 1,
  Text: '',
  TextColor3: palette.muted,
  TextSize: 11,
  TextWrapped: true,
  TextXAlignment: 'Left',
  TextYAlignment: 'Top',
});
append(detailsPanel, detailDescription);

const statGrid = createFrame({
  Size: udim2FromOffset(244, 112),
  Position: udim2FromOffset(18, 292),
  BackgroundTransparency: 1,
});
append(detailsPanel, statGrid);

const climateValue = createLabel('', udim2FromOffset(116, 48), udim2FromOffset(0, 0), 12);
const dangerValue = createLabel('', udim2FromOffset(116, 48), udim2FromOffset(128, 0), 12);
const distanceValue = createLabel('', udim2FromOffset(116, 48), udim2FromOffset(0, 60), 12);
const rewardValue = createLabel('', udim2FromOffset(116, 48), udim2FromOffset(128, 60), 12);
for (const card of [climateValue, dangerValue, distanceValue, rewardValue]) {
  update(card, {
    BackgroundColor3: palette.raised,
    BackgroundTransparency: 0.28,
    TextXAlignment: 'Center',
  });
  decorate(card, 10, color3(54, 72, 116));
  append(statGrid, card);
}

const launchButton = createTextButton({
  Name: 'Launch',
  Size: udim2FromOffset(244, 48),
  Position: udim2FromOffset(18, 418),
  BackgroundColor3: palette.cyan,
  Text: 'LAUNCH COURIER  →',
  TextColor3: palette.void,
  TextSize: 13,
  FontWeight: 850,
});
decorate(launchButton, 14, color3(138, 240, 255), 2);
append(detailsPanel, launchButton);

const rerouteButton = createTextButton({
  Name: 'Reroute',
  Size: udim2FromOffset(244, 38),
  Position: udim2FromOffset(18, 476),
  BackgroundColor3: palette.raised,
  BackgroundTransparency: 0.25,
  Text: 'SURPRISE ME',
  TextColor3: palette.muted,
  TextSize: 11,
  FontWeight: 750,
});
decorate(rerouteButton, 12, palette.border);
attachHover(rerouteButton, palette.raised, color3(47, 61, 108));
append(detailsPanel, rerouteButton);

const launchStatus = createLabel(
  'FLIGHT COMPUTER READY',
  udim2FromOffset(244, 24),
  udim2FromOffset(18, 522),
  9,
  palette.green,
);
update(launchStatus, { TextXAlignment: 'Center' });
append(detailsPanel, launchStatus);

const markerRecords: Array<{ sector: Sector; button: TextButtonNode; stroke: UIStrokeNode }> = [];
const sectorSelected = createSignal<[Sector]>();
let selectedSector = sectors[0]!;

for (const sector of sectors) {
  const marker = createTextButton({
    Name: sector.code,
    Size: udim2FromOffset(112, 34),
    Position: udim2FromOffset(sector.markerX, sector.markerY),
    BackgroundColor3: palette.raised,
    BackgroundTransparency: 0.12,
    Text: `●  ${sector.code}`,
    TextColor3: sector.accent,
    TextSize: 10,
    FontWeight: 800,
  });
  append(marker, createUICorner({ CornerRadius: 17 }));
  const stroke = createUIStroke({ Color: sector.accent, Thickness: 1, Transparency: 0.35 });
  append(marker, stroke);
  attachHover(marker, palette.raised, color3(44, 58, 102));
  on(marker, 'MouseButton1Click', () => sectorSelected.emit(sector));
  markerRecords.push({ sector, button: marker, stroke });
  append(mapPanel, marker);
}

sectorSelected.subscribe((sector) => {
  selectedSector = sector;
  update(detailTitle, { Text: sector.name });
  update(detailCode, { Text: `${sector.code}  •  PRIORITY ROUTE` });
  update(detailDescription, { Text: sector.description });
  update(climateValue, { Text: `CLIMATE\n${sector.climate}`, TextColor3: sector.accent });
  update(dangerValue, {
    Text: `DANGER\n${sector.danger}`,
    TextColor3: sector.danger === 'Severe' ? palette.red : sector.accent,
  });
  update(distanceValue, { Text: `DISTANCE\n${sector.distance}` });
  update(rewardValue, { Text: `REWARD\n◈ ${sector.reward}`, TextColor3: palette.amber });
  update(launchButton, { BackgroundColor3: sector.accent });
  update(modeTitle, { Text: `Star Map  /  ${sector.name.toUpperCase()}` });

  for (const marker of markerRecords) {
    const selected = marker.sector === sector;
    update(marker.button, {
      BackgroundColor3: selected ? marker.sector.accent : palette.raised,
      BackgroundTransparency: selected ? 0.62 : 0.12,
      TextColor3: selected ? palette.text : marker.sector.accent,
    });
    update(marker.stroke, { Thickness: selected ? 2 : 1, Transparency: selected ? 0 : 0.35 });
  }
});

on(planet, 'MouseButton1Click', () => {
  const current = sectors.indexOf(selectedSector);
  sectorSelected.emit(sectors[(current + 1) % sectors.length]!);
});

const expeditionsPanel = createFrame({
  Name: 'Expeditions',
  Size: udim2FromOffset(620, 196),
  Position: udim2FromOffset(260, 546),
  BackgroundColor3: palette.panel,
  BackgroundTransparency: 0.08,
});
decorate(expeditionsPanel, 20);
append(shell, expeditionsPanel);

append(
  expeditionsPanel,
  createLabel(
    'ACTIVE EXPEDITIONS',
    udim2FromOffset(220, 22),
    udim2FromOffset(18, 14),
    11,
    palette.text,
  ),
);

const completionLabel = createLabel(
  `${completed} COMPLETED`,
  udim2FromOffset(160, 22),
  udim2FromOffset(440, 14),
  9,
  palette.green,
);
update(completionLabel, { TextXAlignment: 'Right' });
append(expeditionsPanel, completionLabel);

const missionScroller = createScrollingFrame({
  Size: udim2FromOffset(586, 132),
  Position: udim2FromOffset(17, 48),
  BackgroundTransparency: 1,
  ScrollingDirection: 'X',
});
append(expeditionsPanel, missionScroller);

const missions = [
  ['GLASS HORIZON', 'Deliver 3 prism cores', '72%', palette.cyan],
  ['CHOIR OF DUST', 'Decode the lost refrain', '41%', palette.purple],
  ['GREEN COMET', 'Escort a seed ark', '88%', palette.green],
  ['CROWN RUN', 'Outpace the solar tide', '19%', palette.red],
  ['GILDED MAIL', 'Find the drifting city', '54%', palette.amber],
] as const;

for (const [name, objective, progress, accent] of missions) {
  const card = createFrame({
    Size: udim2FromOffset(184, 124),
    BackgroundColor3: palette.raised,
    BackgroundTransparency: 0.18,
  });
  decorate(card, 14, color3(55, 74, 120));
  append(card, createLabel(name, udim2FromOffset(154, 20), udim2FromOffset(14, 14), 11, accent));
  append(
    card,
    createLabel(objective, udim2FromOffset(154, 34), udim2FromOffset(14, 40), 10, palette.muted),
  );
  const progressTrack = createFrame({
    Size: udim2FromOffset(154, 6),
    Position: udim2FromOffset(14, 84),
    BackgroundColor3: color3(43, 55, 92),
  });
  append(progressTrack, createUICorner({ CornerRadius: 3 }));
  append(card, progressTrack);
  const progressFill = createFrame({
    Size: udim2(Number.parseInt(progress, 10) / 100, 0, 1, 0),
    BackgroundColor3: accent,
  });
  append(progressFill, createUICorner({ CornerRadius: 3 }));
  append(progressTrack, progressFill);
  append(card, createLabel(progress, udim2FromOffset(154, 18), udim2FromOffset(14, 96), 9, accent));
  append(missionScroller, card);
}
append(missionScroller, createUIListLayout({ FillDirection: 'Horizontal', Padding: udim(0, 12) }));

const activityTitle = createLabel(
  'COURIER ACTIVITY',
  udim2FromOffset(244, 20),
  udim2FromOffset(18, 554),
  9,
  palette.muted,
);
update(activityTitle, { TextXAlignment: 'Center' });
append(detailsPanel, activityTitle);

const activityFeed = createScrollingFrame({
  Name: 'ActivityFeed',
  Size: udim2FromOffset(208, 48),
  Position: udim2FromOffset(36, 580),
  BackgroundTransparency: 1,
  ScrollingDirection: 'Y',
});
append(detailsPanel, activityFeed);

const addLog = (message: string, accent: Color3): void => {
  const entry = createTextLabel({
    Size: udim2FromOffset(204, 30),
    BackgroundColor3: accent,
    BackgroundTransparency: 0.88,
    Text: message,
    TextColor3: accent,
    TextSize: 9,
    TextXAlignment: 'Center',
  });
  append(entry, createUICorner({ CornerRadius: 8 }));
  append(activityFeed, entry);
};

addLog('SYSTEMS NOMINAL', palette.green);
addLog('ROUTE NETWORK ONLINE', palette.cyan);
append(activityFeed, createUIListLayout({ Padding: udim(0, 6) }));

on(launchButton, 'MouseButton1Click', () => {
  credits += selectedSector.reward;
  completed += 1;
  update(creditsPill, { Text: `◈ ${credits.toLocaleString()} CREDITS` });
  update(completionLabel, { Text: `${completed} COMPLETED` });
  update(launchStatus, {
    Text: `COURIER LAUNCHED TO ${selectedSector.code}`,
    TextColor3: selectedSector.accent,
  });
  update(launchButton, { Text: 'COURIER IN FLIGHT  ✓' });
  addLog(`LAUNCHED  •  ${selectedSector.code}`, selectedSector.accent);
});

let surpriseIndex = 0;
on(rerouteButton, 'MouseButton1Click', () => {
  surpriseIndex = (surpriseIndex + 2) % sectors.length;
  sectorSelected.emit(sectors[surpriseIndex]!);
  update(launchStatus, { Text: 'SURPRISE ROUTE CALCULATED', TextColor3: palette.purple });
  update(launchButton, { Text: 'LAUNCH COURIER  →' });
});

sectorSelected.emit(sectors[0]!);
mount(gui, '#root');
