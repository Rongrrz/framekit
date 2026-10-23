import { color3FromHex, udim2, udim2FromOffset } from 'framekit';

import { createSampleDocument, type SceneDocument, type SceneNode } from './document';
import { defaultProperties, type NodeType, type PropertyValue } from './schema';

const node = (
  id: string,
  type: NodeType,
  parent: string | null,
  properties: Readonly<Record<string, PropertyValue>>,
): SceneNode => ({
  id,
  type,
  parent,
  properties: { ...defaultProperties(type), ...properties },
});

const text = (
  id: string,
  parent: string,
  value: string,
  x: number,
  y: number,
  size = 16,
  color = '#e8eaf1',
): SceneNode =>
  node(id, 'TextLabel', parent, {
    Name: id.replaceAll('-', ' '),
    Text: value,
    Position: udim2FromOffset(x, y),
    Size: udim2(1, -x * 2 || 0, 0, size * 2),
    TextSize: size,
    TextColor3: color3FromHex(color),
  });

const dashboard = (): SceneDocument => ({
  version: 1,
  name: 'Dashboard',
  width: 1120,
  height: 760,
  nodes: [
    node('shell', 'Frame', null, {
      Name: 'Dashboard',
      Position: udim2FromOffset(0, 0),
      Size: udim2(1, 0, 1, 0),
      BackgroundColor3: color3FromHex('#141820'),
    }),
    node('sidebar', 'Frame', 'shell', {
      Name: 'Navigation',
      Position: udim2FromOffset(0, 0),
      Size: udim2(0, 220, 1, 0),
      BackgroundColor3: color3FromHex('#1c212c'),
    }),
    text('brand', 'sidebar', '◈  STUDIO', 28, 30, 22),
    ...['Overview', 'Analytics', 'Projects', 'Settings'].map((value, index) =>
      node(`nav-${index}`, 'TextButton', 'sidebar', {
        Name: value,
        Text: value,
        Position: udim2FromOffset(20, 110 + index * 54),
        Size: udim2FromOffset(180, 42),
        TextSize: 15,
        TextColor3: color3FromHex(index ? '#9fa8bc' : '#aff1d1'),
        BackgroundColor3: color3FromHex(index ? '#1c212c' : '#284438'),
      }),
    ),
    node('content', 'Frame', 'shell', {
      Name: 'Content',
      Position: udim2FromOffset(250, 30),
      Size: udim2(1, -280, 1, -60),
      BackgroundTransparency: 1,
    }),
    text('page-title', 'content', 'Overview', 0, 0, 32),
    text(
      'page-subtitle',
      'content',
      'A little clarity for your next big idea.',
      0,
      65,
      16,
      '#9fa8bc',
    ),
    ...['Projects', 'Active users', 'This month'].flatMap((value, index) => [
      node(`metric-${index}`, 'Frame', 'content', {
        Name: `${value} card`,
        Position: udim2(index / 3, 0, 0, 132),
        Size: udim2(1 / 3, -16, 0, 152),
        BackgroundColor3: color3FromHex('#232b39'),
      }),
      node(`metric-corner-${index}`, 'UICorner', `metric-${index}`, { CornerRadius: 12 }),
      text(`metric-label-${index}`, `metric-${index}`, value, 24, 20, 14, '#9fa8bc'),
      text(
        `metric-value-${index}`,
        `metric-${index}`,
        ['24', '1,284', '+18.6%'][index]!,
        24,
        64,
        34,
      ),
    ]),
    node('activity', 'Frame', 'content', {
      Name: 'Activity panel',
      Position: udim2FromOffset(0, 320),
      Size: udim2(1, -16, 0, 330),
      BackgroundColor3: color3FromHex('#1c212c'),
    }),
    node('activity-corner', 'UICorner', 'activity', { CornerRadius: 12 }),
    text('activity-title', 'activity', 'Recent activity', 24, 20, 20),
    ...['Website redesign', 'Component library', 'Mobile prototype'].map((value, index) =>
      text(
        `activity-${index}`,
        'activity',
        `${value}                                      In progress`,
        24,
        90 + index * 62,
        16,
        '#9fa8bc',
      ),
    ),
  ],
});

const settings = (): SceneDocument => ({
  version: 1,
  name: 'Settings panel',
  width: 960,
  height: 720,
  nodes: [
    node('settings', 'Frame', null, {
      Name: 'Settings panel',
      Position: udim2FromOffset(120, 48),
      Size: udim2FromOffset(720, 624),
      BackgroundColor3: color3FromHex('#fcfaf7'),
    }),
    node('settings-corner', 'UICorner', 'settings', { CornerRadius: 24 }),
    text('settings-title', 'settings', 'Make yourself at home.', 40, 32, 30, '#252a32'),
    text(
      'settings-copy',
      'settings',
      'A starter panel for profiles, preferences, and everything else.',
      40,
      90,
      15,
      '#7b7e84',
    ),
    ...['Display name', 'Email address'].flatMap((value, index) => [
      text(`field-label-${index}`, 'settings', value, 40, 156 + index * 104, 14, '#555a64'),
      node(`field-${index}`, 'TextInput', 'settings', {
        Name: value,
        Text: '',
        PlaceholderText: index ? 'you@example.com' : 'Your name',
        Position: udim2FromOffset(40, 196 + index * 104),
        Size: udim2FromOffset(640, 48),
        BackgroundTransparency: 0,
        BackgroundColor3: color3FromHex('#f0eeea'),
        TextSize: 16,
      }),
      node(`field-corner-${index}`, 'UICorner', `field-${index}`, { CornerRadius: 8 }),
    ]),
    text('preferences-title', 'settings', 'Your space. Your rules.', 40, 400, 20, '#252a32'),
    text(
      'preferences-copy',
      'settings',
      'Add more controls from Insert, then arrange them in Explorer.',
      40,
      445,
      15,
      '#7b7e84',
    ),
    node('save', 'TextButton', 'settings', {
      Name: 'Save preferences',
      Text: 'Save preferences  →',
      Position: udim2FromOffset(40, 526),
      Size: udim2FromOffset(240, 52),
      TextSize: 16,
      BackgroundColor3: color3FromHex('#284438'),
      TextColor3: color3FromHex('#aff1d1'),
    }),
    node('save-corner', 'UICorner', 'save', { CornerRadius: 10 }),
  ],
});

/** Templates are independent documents; edits never mutate the next project's starting point. */
export const projectTemplates = [
  {
    id: 'blank',
    name: 'Blank canvas',
    description: 'A clean start. All yours.',
    accent: '#aff1d1',
    kind: 'blank',
    create: (): SceneDocument => ({
      version: 1,
      name: 'Untitled project',
      width: 960,
      height: 640,
      nodes: [],
    }),
  },
  {
    id: 'welcome',
    name: 'Welcome card',
    description: 'Typography, cards, and a clear call to action.',
    accent: '#aff1d1',
    kind: 'welcome',
    create: createSampleDocument,
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Navigation, metrics, and space to grow.',
    accent: '#a5baff',
    kind: 'dashboard',
    create: dashboard,
  },
  {
    id: 'settings',
    name: 'Settings panel',
    description: 'A warm, focused form with real inputs.',
    accent: '#e9c5a0',
    kind: 'settings',
    create: settings,
  },
] as const;
