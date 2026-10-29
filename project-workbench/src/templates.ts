import { color3FromHex, udim, udim2, udim2FromOffset, type UDim2 } from 'framekit';

import {
  createSampleDocument,
  type SceneDocument,
  type SceneNode,
  type LayoutBreakpoint,
} from './document';
import { defaultProperties, definitionFor, type NodeType, type PropertyValue } from './schema';

const node = (
  id: string,
  type: NodeType,
  parent: string | null,
  properties: Readonly<Record<string, PropertyValue>>,
): SceneNode => ({
  id,
  type,
  parent,
  properties: {
    ...defaultProperties(type),
    Name: id.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    ...properties,
  },
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
    Name: id.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    Text: value,
    Position: udim2FromOffset(x, y),
    Size: udim2(1, -x * 2 || 0, 0, size * 2),
    TextSize: size,
    TextColor3: color3FromHex(color),
  });

const script = (id: string, parent: string | null, source: string): SceneNode =>
  node(id, 'Script', parent, {
    Name: id.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    Source: `import type { ScriptContext } from '@framekit/script';\n${source}`,
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
    ...['Overview', 'Analytics', 'Projects'].map((value, index) =>
      node(`nav-${index}`, 'TextButton', 'sidebar', {
        Name: value,
        AccessibleLabel: value,
        Text: value,
        TextXAlignment: 'Center',
        Position: udim2FromOffset(20, 110 + index * 54),
        Size: udim2FromOffset(180, 42),
        TextSize: 15,
        TextColor3: color3FromHex(index ? '#9fa8bc' : '#aff1d1'),
        BackgroundColor3: color3FromHex(index ? '#1c212c' : '#284438'),
      }),
    ),
    node('nav-radius', 'UICorner', 'nav-0', { Name: 'Navigation radius', CornerRadius: 8 }),
    node('content', 'ScrollingFrame', 'shell', {
      Name: 'Content',
      Position: udim2FromOffset(250, 30),
      Size: udim2(1, -280, 1, -60),
      BackgroundTransparency: 1,
      ClipsDescendants: true,
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
      Size: udim2(1, -16, 0, 860),
      BackgroundColor3: color3FromHex('#1c212c'),
    }),
    node('activity-corner', 'UICorner', 'activity', { CornerRadius: 12 }),
    text('activity-title', 'activity', 'Recent activity', 24, 20, 20),
    ...[
      'Website redesign',
      'Component library',
      'Mobile prototype',
      'Customer portal',
      'Design system',
      'Onboarding flow',
      'Reports',
      'Team workspace',
      'API dashboard',
      'Marketing pages',
      'Checkout',
      'Documentation',
    ].flatMap((value, index) => [
      node(`activity-${index}`, 'Frame', 'activity', {
        Name: value,
        Position: udim2FromOffset(24, 90 + index * 62),
        Size: udim2(1, -48, 0, 48),
        BackgroundTransparency: 1,
      }),
      node(`activity-name-${index}`, 'TextLabel', `activity-${index}`, {
        Name: 'Project name',
        Position: udim2FromOffset(0, 0),
        Text: value,
        Size: udim2(0.65, -8, 1, 0),
        TextSize: 15,
        TextColor3: color3FromHex('#9fa8bc'),
        TextWrapped: true,
      }),
      node(`activity-status-${index}`, 'TextLabel', `activity-${index}`, {
        Name: 'Project status',
        Text: 'In progress',
        Position: udim2(0.65, 0, 0, 0),
        Size: udim2(0.35, 0, 1, 0),
        TextSize: 12,
        TextXAlignment: 'Right',
        TextColor3: color3FromHex('#aff1d1'),
        TextWrapped: true,
      }),
    ]),
    script(
      'dashboard-behavior',
      'shell',
      `export default (ctx: ScriptContext): void => {
  const title = ctx.node('page-title');
  const subtitle = ctx.node('page-subtitle');
  const pages = ['Overview', 'Analytics', 'Projects'];
  const descriptions = [
    'A little clarity for your next big idea.',
    'Your audience is growing. Here is the latest.',
    'Twelve projects are ready to explore below.',
  ];
  const metrics = [
    ['24', '1,284', '+18.6%'],
    ['8,410', '1,284', '+24.2%'],
    ['24', '18', '6'],
  ];
  const labels = [
    ['Projects', 'Active users', 'This month'],
    ['Page views', 'Active users', 'Engagement'],
    ['Total projects', 'In progress', 'Completed'],
  ];
  pages.forEach((page, index) => {
    const nav = ctx.node('nav-' + index);
    if (nav?.isA('TextButton')) {
      ctx.own(
        nav.onClick(() => {
          if (title?.isA('TextLabel')) title.Text = page;
          if (subtitle?.isA('TextLabel')) subtitle.Text = descriptions[index]!;
          pages.forEach((_, other) => {
            const button = ctx.node('nav-' + other);
            if (button?.isA('TextButton'))
              button.Text = (index === other ? '• ' : '') + pages[other];
          });
          [0, 1, 2].forEach((metric) => {
            const value = ctx.node('metric-value-' + metric);
            const label = ctx.node('metric-label-' + metric);
            if (value?.isA('TextLabel')) value.Text = metrics[index]![metric]!;
            if (label?.isA('TextLabel')) label.Text = labels[index]![metric]!;
          });
          const activity = ctx.node('activity-title');
          if (activity?.isA('TextLabel'))
            activity.Text =
              index === 1
                ? 'Top performing projects'
                : index === 2
                  ? 'Your projects'
                  : 'Recent activity';
          const content = ctx.node('content');
          if (content?.isA('ScrollingFrame')) content.CanvasPosition = { X: 0, Y: 0 };
        }),
      );
    }
  });
};
`,
    ),
  ],
});

const settings = (): SceneDocument => ({
  version: 1,
  name: 'Settings panel',
  width: 960,
  height: 720,
  nodes: [
    node('settings', 'ScrollingFrame', null, {
      Name: 'Settings panel',
      Position: udim2FromOffset(24, 24),
      Size: udim2(1, -48, 1, -48),
      ClipsDescendants: true,
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
        AccessibleLabel: value,
        Text: '',
        PlaceholderText: index ? 'you@example.com' : 'Your name',
        Position: udim2FromOffset(40, 196 + index * 104),
        Size: udim2(1, -80, 0, 48),
        BackgroundTransparency: 0,
        BackgroundColor3: color3FromHex('#f0eeea'),
        TextSize: 16,
      }),
      node(`field-corner-${index}`, 'UICorner', `field-${index}`, { CornerRadius: 8 }),
    ]),
    node('field-padding', 'UIPadding', 'field-0', {
      Name: 'Field inset',
      PaddingLeft: udim(0, 14),
      PaddingRight: udim(0, 14),
      PaddingTop: udim(0, 0),
      PaddingBottom: udim(0, 0),
    }),
    text('preferences-title', 'settings', 'Your space. Your rules.', 40, 400, 20, '#252a32'),
    text(
      'preferences-copy',
      'settings',
      'Email notifications are on. Changes apply to this presentation.',
      40,
      445,
      15,
      '#7b7e84',
    ),
    node('save', 'TextButton', 'settings', {
      Name: 'Save preferences',
      Text: 'Save preferences  →',
      TextXAlignment: 'Center',
      Position: udim2FromOffset(40, 526),
      Size: udim2FromOffset(240, 52),
      TextSize: 16,
      BackgroundColor3: color3FromHex('#284438'),
      TextColor3: color3FromHex('#aff1d1'),
    }),
    node('save-corner', 'UICorner', 'save', { CornerRadius: 10 }),
    node('notifications', 'TextButton', 'settings', {
      Name: 'Notifications',
      Text: 'Notifications: On',
      TextXAlignment: 'Center',
      AccessibleLabel: 'Toggle notifications',
      Position: udim2FromOffset(40, 602),
      Size: udim2FromOffset(240, 44),
      TextSize: 15,
      BackgroundColor3: color3FromHex('#e8eee8'),
      TextColor3: color3FromHex('#284438'),
    }),
    node('notifications-radius', 'UICorner', 'notifications', {
      Name: 'Notification radius',
      CornerRadius: 10,
    }),
    text('save-status', 'settings', 'Your preferences are ready to edit.', 40, 668, 15, '#284438'),
    script(
      'settings-behavior',
      'settings',
      `export default (ctx: ScriptContext): void => {
  const save = ctx.node('save');
  const name = ctx.node('field-0');
  const email = ctx.node('field-1');
  const status = ctx.node('save-status');
  const notifications = ctx.node('notifications');
  let enabled = true;
  if (notifications?.isA('TextButton'))
    ctx.own(
      notifications.onClick(() => {
        enabled = !enabled;
        notifications.Text = 'Notifications: ' + (enabled ? 'On' : 'Off');
      }),
    );
  const submit = (): void => {
    if (
      !name?.isA('TextInput') ||
      !email?.isA('TextInput') ||
      !status?.isA('TextLabel')
    )
      return;
    if (!name.Text.trim() || !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email.Text)) {
      status.Text = 'Enter your name and a valid email address.';
      return;
    }
    status.Text =
      'Saved for ' + name.Text.trim() + ' · Notifications ' + (enabled ? 'on' : 'off');
  };
  if (save?.isA('TextButton')) ctx.own(save.onClick(submit));
  if (email?.isA('TextInput'))
    ctx.listen(email.unsafeElement, 'keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Enter') submit();
    });
};
`,
    ),
  ],
});

const welcome = (): SceneDocument => {
  const document = createSampleDocument();
  const root = document.nodes.find((node) => node.id === 'button')!;
  const children = document.nodes.filter((node) => node.parent === root.id);
  const prefabId = 'primary-button';
  return {
    ...document,
    nodes: document.nodes
      .filter((node) => node.parent !== root.id)
      .map((node) =>
        node.id === root.id
          ? {
              ...node,
              prefabId,
              properties: {
                Name: root.properties.Name,
                Position: root.properties.Position!,
                Size: root.properties.Size!,
              },
            }
          : node,
      ),
    prefabs: [
      {
        id: prefabId,
        name: 'Primary button',
        width: 240,
        height: 52,
        nodes: [
          {
            ...root,
            parent: null,
            properties: { ...root.properties, Position: udim2FromOffset(0, 0) },
          },
          ...children,
        ],
        events: ['Pressed'],
        bindings: [
          {
            id: 'button-output',
            source: root.id,
            event: 'Activated',
            action: { type: 'emit', event: 'Pressed' },
          },
        ],
      },
    ],
    bindings: [
      {
        id: 'welcome-response',
        source: root.id,
        event: 'Pressed',
        action: {
          type: 'set',
          target: 'footnote',
          property: 'Text',
          value: 'Your prefab event is connected. Keep building!',
        },
      },
    ],
  };
};

const counter = (): SceneDocument => ({
  version: 1,
  name: 'Interactive counters',
  width: 960,
  height: 640,
  nodes: [
    node('counter-page', 'Frame', null, {
      Name: 'Counter page',
      Position: udim2FromOffset(0, 0),
      Size: udim2(1, 0, 1, 0),
      BackgroundColor3: color3FromHex('#141820'),
    }),
    text('counter-title', 'counter-page', 'Small pieces. Real behavior.', 48, 36, 30),
    text(
      'counter-subtitle',
      'counter-page',
      'Two instances. One definition. Independent state.',
      48,
      98,
      16,
      '#9fa8bc',
    ),
    {
      id: 'left-counter',
      type: 'Frame',
      parent: 'counter-page',
      prefabId: 'counter-panel',
      properties: { Name: 'Left counter', Position: udim2FromOffset(48, 180) },
    },
    {
      id: 'right-counter',
      type: 'Frame',
      parent: 'counter-page',
      prefabId: 'counter-panel',
      properties: { Name: 'Right counter', Position: udim2FromOffset(496, 180) },
    },
    text(
      'counter-status',
      'counter-page',
      'Choose Present, then press a button.',
      48,
      510,
      16,
      '#aff1d1',
    ),
  ],
  prefabs: [
    {
      id: 'counter',
      name: 'Counter',
      width: 320,
      height: 200,
      events: ['Changed'],
      nodes: [
        node('counter-root', 'Frame', null, {
          Name: 'Counter root',
          Position: udim2FromOffset(0, 0),
          Size: udim2FromOffset(320, 200),
          BackgroundTransparency: 1,
        }),
        node('count', 'TextLabel', 'counter-root', {
          Name: 'Count',
          Text: '0',
          Position: udim2FromOffset(0, 0),
          Size: udim2FromOffset(320, 90),
          TextSize: 56,
          TextXAlignment: 'Center',
          TextColor3: color3FromHex('#e8eaf1'),
        }),
        node('increment', 'TextButton', 'counter-root', {
          Name: 'Increment',
          Text: '+  Add one',
          TextXAlignment: 'Center',
          Position: udim2FromOffset(40, 118),
          Size: udim2FromOffset(240, 52),
          BackgroundColor3: color3FromHex('#aff1d1'),
          TextColor3: color3FromHex('#172a23'),
          TextSize: 17,
        }),
        node('increment-round', 'UICorner', 'increment', { CornerRadius: 10 }),
      ],
      bindings: [
        {
          id: 'increment-count',
          source: 'increment',
          event: 'Activated',
          action: { type: 'increment', target: 'count', amount: 1 },
        },
        {
          id: 'announce-count',
          source: 'increment',
          event: 'Activated',
          action: { type: 'emit', event: 'Changed' },
        },
      ],
    },
    {
      id: 'counter-panel',
      name: 'Counter panel',
      width: 416,
      height: 280,
      events: ['CountChanged'],
      nodes: [
        node('panel-root', 'Frame', null, {
          Name: 'Panel',
          Position: udim2FromOffset(0, 0),
          Size: udim2FromOffset(416, 280),
          BackgroundColor3: color3FromHex('#232b39'),
        }),
        node('panel-round', 'UICorner', 'panel-root', { CornerRadius: 20 }),
        {
          id: 'nested-counter',
          type: 'Frame',
          parent: 'panel-root',
          prefabId: 'counter',
          properties: { Name: 'Nested counter', Position: udim2FromOffset(48, 40) },
        },
      ],
      bindings: [
        {
          id: 'forward-change',
          source: 'nested-counter',
          event: 'Changed',
          action: { type: 'emit', event: 'CountChanged' },
        },
      ],
    },
  ],
  bindings: [
    {
      id: 'left-change',
      source: 'left-counter',
      event: 'CountChanged',
      action: {
        type: 'set',
        target: 'counter-status',
        property: 'Text',
        value: 'The left prefab emitted CountChanged.',
      },
    },
    {
      id: 'right-change',
      source: 'right-counter',
      event: 'CountChanged',
      action: {
        type: 'set',
        target: 'counter-status',
        property: 'Text',
        value: 'The right prefab emitted CountChanged.',
      },
    },
  ],
});

const taskBoard = (): SceneDocument => ({
  version: 1,
  name: 'Task board',
  width: 960,
  height: 720,
  nodes: [
    node('board', 'Frame', null, {
      Name: 'Task board',
      Position: udim2FromOffset(0, 0),
      Size: udim2(1, 0, 1, 0),
      BackgroundColor3: color3FromHex('#152321'),
    }),
    text('board-title', 'board', 'A little progress, every day.', 32, 24, 28, '#e6f5ed'),
    text('board-copy', 'board', 'Add a task, check it off, and keep going.', 32, 88, 15, '#9eb5ac'),
    node('task-input', 'TextInput', 'board', {
      Name: 'New task',
      AccessibleLabel: 'New task',
      PlaceholderText: 'What needs doing?',
      Position: udim2FromOffset(32, 144),
      Size: udim2(1, -216, 0, 44),
      BackgroundColor3: color3FromHex('#243d35'),
      TextColor3: color3FromHex('#e6f5ed'),
      TextSize: 15,
    }),
    node('task-add', 'TextButton', 'board', {
      Name: 'Add task',
      AccessibleLabel: 'Add task',
      Text: '+ Add task',
      TextXAlignment: 'Center',
      Position: udim2(1, -164, 0, 144),
      Size: udim2FromOffset(132, 44),
      BackgroundColor3: color3FromHex('#aff1d1'),
      TextColor3: color3FromHex('#152321'),
      TextSize: 15,
    }),
    node('task-list', 'ScrollingFrame', 'board', {
      Name: 'Tasks',
      Position: udim2FromOffset(32, 216),
      Size: udim2(1, -64, 1, -310),
      BackgroundTransparency: 1,
      ClipsDescendants: true,
    }),
    node('tasks-layout', 'UIListLayout', 'task-list', { Padding: { Scale: 0, Offset: 10 } }),
    ...[
      'Sketch a new idea',
      'Build a reusable button',
      'Try the phone preview',
      'Connect an event',
      'Create a prefab',
      'Add TypeScript logic',
      'Test scrolling',
      'Polish the spacing',
      'Check light and dark',
      'Present your project',
      'Export the ZIP',
      'Ship something useful',
    ].map((title, index) =>
      node(`task-${index}`, 'TextButton', 'task-list', {
        Name: title,
        Text: `○  ${title}`,
        AccessibleLabel: title,
        Size: udim2(1, -8, 0, 48),
        LayoutOrder: index,
        BackgroundColor3: color3FromHex('#243d35'),
        TextColor3: color3FromHex('#e6f5ed'),
        TextXAlignment: 'Left',
        TextSize: 15,
      }),
    ),
    node('task-row-radius', 'UICorner', 'task-0', { Name: 'Task radius', CornerRadius: 10 }),
    node('task-row-padding', 'UIPadding', 'task-0', {
      Name: 'Task inset',
      PaddingLeft: udim(0, 16),
      PaddingRight: udim(0, 16),
      PaddingTop: udim(0, 0),
      PaddingBottom: udim(0, 0),
    }),
    node('task-input-radius', 'UICorner', 'task-input', { CornerRadius: 10 }),
    node('task-input-padding', 'UIPadding', 'task-input', {
      PaddingLeft: udim(0, 14),
      PaddingRight: udim(0, 14),
      PaddingTop: udim(0, 0),
      PaddingBottom: udim(0, 0),
    }),
    node('task-add-radius', 'UICorner', 'task-add', { CornerRadius: 10 }),
    text('task-status', 'board', '12 tasks · 0 completed', 32, 0, 14, '#9eb5ac'),
    node('task-clear', 'TextButton', 'board', {
      Name: 'Clear completed',
      AccessibleLabel: 'Clear completed',
      Text: 'Clear completed',
      TextXAlignment: 'Center',
      Position: udim2(1, -202, 1, -64),
      Size: udim2FromOffset(170, 36),
      BackgroundColor3: color3FromHex('#243d35'),
      TextColor3: color3FromHex('#aff1d1'),
      TextSize: 13,
    }),
    node('task-clear-radius', 'UICorner', 'task-clear', { CornerRadius: 10 }),
    script(
      'task-behavior',
      'board',
      `import { createTextButton, createUICorner, createUIPadding, color3FromHex, udim, udim2, type TextButton } from 'framekit';
export default (ctx: ScriptContext): void => {
  const input = ctx.node('task-input');
  const list = ctx.node('task-list');
  const status = ctx.node('task-status');
  const add = ctx.node('task-add');
  const clear = ctx.node('task-clear');
  const tasks = new Map<TextButton, boolean>();
  let order = 12;
  const update = (): void => {
    if (status?.isA('TextLabel'))
      status.Text =
        tasks.size +
        ' tasks · ' +
        [...tasks.values()].filter(Boolean).length +
        ' completed';
  };
  const attach = (button: TextButton, title: string): void => {
    tasks.set(button, false);
    button.onClick(() => {
      const done = !tasks.get(button);
      tasks.set(button, done);
      button.Text = (done ? '✓  ' : '○  ') + title;
      button.unsafeElement.setAttribute('aria-pressed', String(done));
      update();
    });
    button.onDestroy(() => tasks.delete(button));
  };
  for (let index = 0; index < 12; index += 1) {
    const task = ctx.node('task-' + index);
    if (task?.isA('TextButton')) attach(task, task.Name);
  }
  const addTask = (): void => {
    if (!input?.isA('TextInput') || !list?.isA('ScrollingFrame') || !input.Text.trim())
      return;
    if (tasks.size >= 100) {
      if (status?.isA('TextLabel'))
        status.Text = 'Finish a few tasks before adding more.';
      return;
    }
    const title = input.Text.trim().slice(0, 200);
    const task = createTextButton({
      Name: title,
      Text: '○  ' + title,
      AccessibleLabel: title,
      Size: udim2(1, -8, 0, 48),
      LayoutOrder: order++,
      TextXAlignment: 'Left',
      TextSize: 15,
      BackgroundColor3: color3FromHex('#243d35'),
      TextColor3: color3FromHex('#e6f5ed'),
    });
    createUICorner({ Name: 'Task radius', CornerRadius: 10 }).Parent = task;
    createUIPadding({ Name: 'Task inset', PaddingLeft: udim(0, 16), PaddingRight: udim(0, 16) }).Parent = task;
    task.Parent = list;
    attach(task, title);
    input.Text = '';
    input.focus();
    update();
  };
  if (add?.isA('TextButton')) ctx.own(add.onClick(addTask));
  if (input?.isA('TextInput'))
    ctx.listen(input.unsafeElement, 'keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Enter') addTask();
    });
  if (clear?.isA('TextButton'))
    ctx.own(
      clear.onClick(() => {
        for (const [task, done] of tasks) if (done) task.destroy();
        update();
      }),
    );
};
`,
    ),
  ].map((entry) =>
    entry.id === 'task-status'
      ? {
          ...entry,
          properties: {
            ...entry.properties,
            Position: udim2(0, 32, 1, -64),
            Size: udim2(1, -250, 0, 36),
          },
        }
      : entry,
  ),
});

type LayoutOverrides = Readonly<Record<string, Readonly<Record<string, PropertyValue>>>>;

const withLayout = (
  document: SceneDocument,
  layout: LayoutBreakpoint,
  overrides: LayoutOverrides,
): SceneDocument => ({
  ...document,
  nodes: document.nodes.map((node) =>
    overrides[node.id]
      ? {
          ...node,
          responsive: { ...node.responsive, [layout]: overrides[node.id] },
        }
      : node,
  ),
});

/** Repeated controls keep stable instance IDs so their existing behavior remains connected. */
const withControlPrefab = (
  document: SceneDocument,
  ids: readonly string[],
  id: string,
  name: string,
): SceneDocument => {
  const first = document.nodes.find((node) => node.id === ids[0])!;
  const size = first.properties.Size as UDim2;
  const width = size.X.Scale ? 320 : size.X.Offset;
  const height = size.Y.Scale ? 48 : size.Y.Offset;
  const decorations = document.nodes.filter(
    (node) => node.parent === first.id && definitionFor(node.type).category === 'modifier',
  );
  const root: SceneNode = {
    id: `${id}-root`,
    type: first.type,
    parent: null,
    properties: {
      ...first.properties,
      Name: name,
      Position: udim2FromOffset(0, 0),
      Size: udim2FromOffset(width, height),
    },
  };
  const removed = new Set(
    document.nodes
      .filter(
        (node) =>
          ids.includes(node.parent ?? '') && definitionFor(node.type).category === 'modifier',
      )
      .map((node) => node.id),
  );
  return {
    ...document,
    nodes: document.nodes
      .filter((node) => !removed.has(node.id))
      .map((node) =>
        ids.includes(node.id)
          ? {
              ...node,
              prefabId: id,
              properties: Object.fromEntries(
                Object.entries(node.properties).filter(
                  ([key, value]) =>
                    key === 'Name' ||
                    JSON.stringify(value) !== JSON.stringify(root.properties[key]),
                ),
              ) as SceneNode['properties'],
            }
          : node,
      ),
    prefabs: [
      ...(document.prefabs ?? []),
      {
        id,
        name,
        width,
        height,
        nodes: [root, ...decorations.map((node) => ({ ...node, parent: root.id }))],
      },
    ],
  };
};

const responsiveWelcome = (): SceneDocument => {
  const document = welcome();
  const fluid = {
    ...document,
    nodes: document.nodes.map((node) => ({
      ...node,
      ...(node.id === 'card' ? { type: 'ScrollingFrame' as const } : {}),
      properties: {
        ...node.properties,
        Name:
          node.properties.Name === node.type ? node.id.replaceAll('-', ' ') : node.properties.Name,
        ...(node.id === 'card'
          ? {
              ...defaultProperties('ScrollingFrame'),
              ...node.properties,
              Position: udim2FromOffset(16, 16),
              Size: udim2(1, -32, 1, -32),
              ClipsDescendants: true,
            }
          : {}),
        ...(['eyebrow', 'headline', 'description'].includes(node.id)
          ? { Size: udim2(1, -80, 0, node.id === 'headline' ? 60 : 40), TextWrapped: true }
          : {}),
        ...(node.id === 'feature' ? { Size: udim2(1, -80, 0, 164) } : {}),
        ...(['feature-title', 'feature-copy'].includes(node.id)
          ? { Size: udim2(1, -56, 0, node.id === 'feature-title' ? 36 : 64), TextWrapped: true }
          : {}),
      },
    })),
  };
  return withLayout(fluid, 'phone', {
    card: { Position: udim2FromOffset(16, 16), Size: udim2(1, -32, 1, -32) },
    eyebrow: { Position: udim2FromOffset(24, 24), Size: udim2(1, -48, 0, 24), TextSize: 10 },
    headline: { Position: udim2FromOffset(24, 64), Size: udim2(1, -48, 0, 100), TextSize: 32 },
    description: { Position: udim2FromOffset(24, 174), Size: udim2(1, -48, 0, 72), TextSize: 16 },
    feature: { Position: udim2FromOffset(24, 268), Size: udim2(1, -48, 0, 200) },
    'feature-title': {
      Position: udim2FromOffset(20, 20),
      Size: udim2(1, -40, 0, 64),
      TextSize: 22,
    },
    'feature-copy': { Position: udim2FromOffset(20, 92), Size: udim2(1, -40, 0, 96), TextSize: 15 },
    button: { Position: udim2FromOffset(24, 492), Size: udim2(1, -48, 0, 52) },
    footnote: { Position: udim2FromOffset(24, 560), Size: udim2(1, -48, 0, 64), TextWrapped: true },
  });
};

const responsiveDashboard = (): SceneDocument => {
  const document = withControlPrefab(
    dashboard(),
    ['nav-0', 'nav-1', 'nav-2'],
    'navigation-link',
    'Navigation link',
  );
  const phone: Record<string, Record<string, PropertyValue>> = {
    sidebar: { Size: udim2(1, 0, 0, 88) },
    brand: { Visible: false },
    content: { Position: udim2FromOffset(20, 108), Size: udim2(1, -40, 1, -128) },
    'page-title': { TextSize: 28 },
    'page-subtitle': {
      Position: udim2FromOffset(0, 64),
      Size: udim2(1, 0, 0, 48),
      TextWrapped: true,
    },
    activity: { Position: udim2FromOffset(0, 500), Size: udim2(1, 0, 0, 860) },
  };
  for (let index = 0; index < 3; index++) {
    phone[`nav-${index}`] = {
      Position: udim2(index / 3, 8, 0, 24),
      Size: udim2(1 / 3, -16, 0, 40),
      TextSize: 13,
    };
    phone[`metric-${index}`] = {
      Position: udim2FromOffset(0, 136 + index * 116),
      Size: udim2(1, 0, 0, 100),
    };
    phone[`metric-label-${index}`] = { Position: udim2FromOffset(20, 10) };
    phone[`metric-value-${index}`] = { Position: udim2FromOffset(20, 42), TextSize: 28 };
  }
  return withLayout(withLayout(document, 'phone', phone), 'tablet', {
    sidebar: { Size: udim2(0, 160, 1, 0) },
    brand: { Position: udim2FromOffset(16, 30), TextSize: 18 },
    'nav-0': { Position: udim2FromOffset(12, 110), Size: udim2FromOffset(136, 42) },
    'nav-1': { Position: udim2FromOffset(12, 164), Size: udim2FromOffset(136, 42) },
    'nav-2': { Position: udim2FromOffset(12, 218), Size: udim2FromOffset(136, 42) },
    content: { Position: udim2FromOffset(180, 30), Size: udim2(1, -200, 1, -60) },
  });
};

const responsiveSettings = (): SceneDocument =>
  withLayout(
    withControlPrefab(settings(), ['field-0', 'field-1'], 'profile-field', 'Profile field'),
    'phone',
    {
      settings: { Position: udim2FromOffset(12, 12), Size: udim2(1, -24, 1, -24) },
      'settings-title': {
        Position: udim2FromOffset(24, 24),
        Size: udim2(1, -48, 0, 76),
        TextSize: 26,
        TextWrapped: true,
      },
      'settings-copy': {
        Position: udim2FromOffset(24, 108),
        Size: udim2(1, -48, 0, 64),
        TextWrapped: true,
      },
      'field-label-0': { Position: udim2FromOffset(24, 190) },
      'field-label-1': { Position: udim2FromOffset(24, 294) },
      'field-0': { Position: udim2FromOffset(24, 230), Size: udim2(1, -48, 0, 48) },
      'field-1': { Position: udim2FromOffset(24, 334), Size: udim2(1, -48, 0, 48) },
      'preferences-title': { Position: udim2FromOffset(24, 426), TextSize: 19 },
      'preferences-copy': {
        Position: udim2FromOffset(24, 470),
        Size: udim2(1, -48, 0, 72),
        TextWrapped: true,
      },
      save: { Position: udim2FromOffset(24, 566), Size: udim2(1, -48, 0, 52) },
      notifications: { Position: udim2FromOffset(24, 634), Size: udim2(1, -48, 0, 44) },
      'save-status': {
        Position: udim2FromOffset(24, 702),
        Size: udim2(1, -48, 0, 60),
        TextWrapped: true,
      },
    },
  );

const responsiveTasks = (): SceneDocument =>
  withLayout(
    withControlPrefab(
      taskBoard(),
      Array.from({ length: 12 }, (_, index) => `task-${index}`),
      'task-row',
      'Task row',
    ),
    'phone',
    {
      'board-title': {
        Position: udim2FromOffset(20, 20),
        Size: udim2(1, -40, 0, 76),
        TextSize: 26,
        TextWrapped: true,
      },
      'board-copy': {
        Position: udim2FromOffset(20, 100),
        Size: udim2(1, -40, 0, 50),
        TextWrapped: true,
      },
      'task-input': { Position: udim2FromOffset(20, 166), Size: udim2(1, -40, 0, 44) },
      'task-add': { Position: udim2FromOffset(20, 222), Size: udim2(1, -40, 0, 44) },
      'task-list': { Position: udim2FromOffset(20, 290), Size: udim2(1, -40, 1, -400) },
      'task-status': { Position: udim2(0, 20, 1, -100), Size: udim2(1, -40, 0, 30) },
      'task-clear': { Position: udim2(0, 20, 1, -60), Size: udim2(1, -40, 0, 36) },
    },
  );

const responsiveCounters = (): SceneDocument => {
  const document = counter();
  return withLayout(
    {
      ...document,
      nodes: document.nodes.map((node) =>
        ['left-counter', 'right-counter'].includes(node.id)
          ? {
              ...node,
              properties: {
                ...node.properties,
                Position: udim2(
                  node.id === 'left-counter' ? 0 : 0.5,
                  node.id === 'left-counter' ? 48 : 24,
                  0,
                  180,
                ),
                Size: udim2(0.5, -72, 0, 280),
              },
            }
          : node.id === 'counter-page'
            ? {
                ...node,
                type: 'ScrollingFrame' as const,
                properties: {
                  ...defaultProperties('ScrollingFrame'),
                  ...node.properties,
                  ClipsDescendants: true,
                },
              }
            : node,
      ),
      prefabs: document.prefabs!.map((prefab) => ({
        ...prefab,
        nodes: prefab.nodes.map((node) => ({
          ...node,
          properties: {
            ...node.properties,
            ...(node.id === 'nested-counter'
              ? { Position: udim2FromOffset(24, 24), Size: udim2(1, -48, 0, 200) }
              : {}),
            ...(node.id === 'count' ? { Size: udim2(1, 0, 0, 90) } : {}),
            ...(node.id === 'increment'
              ? { Position: udim2FromOffset(24, 118), Size: udim2(1, -48, 0, 52) }
              : {}),
          },
        })),
      })),
    },
    'phone',
    {
      'counter-title': {
        Position: udim2FromOffset(20, 24),
        Size: udim2(1, -40, 0, 76),
        TextSize: 26,
        TextWrapped: true,
      },
      'counter-subtitle': {
        Position: udim2FromOffset(20, 108),
        Size: udim2(1, -40, 0, 48),
        TextWrapped: true,
      },
      'left-counter': { Position: udim2FromOffset(16, 176), Size: udim2(1, -32, 0, 248) },
      'right-counter': { Position: udim2FromOffset(16, 448), Size: udim2(1, -32, 0, 248) },
      'counter-status': {
        Position: udim2FromOffset(20, 720),
        Size: udim2(1, -40, 0, 60),
        TextWrapped: true,
      },
    },
  );
};

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
    description: 'Responsive typography, a reusable call to action, and connected events.',
    accent: '#aff1d1',
    kind: 'welcome',
    create: responsiveWelcome,
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Desktop sidebar, phone navigation, reusable links, and live metrics.',
    accent: '#a5baff',
    kind: 'dashboard',
    create: responsiveDashboard,
  },
  {
    id: 'settings',
    name: 'Settings panel',
    description: 'A scrolling form with validation, notifications, and save feedback.',
    accent: '#e9c5a0',
    kind: 'settings',
    create: responsiveSettings,
  },
  {
    id: 'tasks',
    name: 'Task board',
    description: 'Reusable task rows, a stacked phone layout, and working task actions.',
    accent: '#aff1d1',
    kind: 'dashboard',
    create: responsiveTasks,
  },
  {
    id: 'counter',
    name: 'Interactive counters',
    description: 'Nested prefabs, custom events, and real behavior.',
    accent: '#aff1d1',
    kind: 'dashboard',
    create: responsiveCounters,
  },
] as const;
