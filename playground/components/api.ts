import { fk, fkh } from 'framekit';

import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { appendSectionHeading, createSection, createSectionContent } from '../section';
import { colors, fonts } from '../theme';
import { createButton } from '../ui';
import { createApiTopicPanel, type ApiTopic } from './api-topic';

const apiTopics = [
  {
    tab: 'INSTANCES',
    eyebrow: '01 / INSTANCES',
    title: 'Build a hierarchy.',
    body: 'Every persistent object has a Name, ClassName, and live Parent. Traverse or print any subtree without touching the DOM.',
    tokens: 'Parent  ·  ClassName\nfindFirstChild  ·  printTree',
    lines: [
      'const editor =',
      '  fk.createTextBox({',
      "    Name: 'Editor',",
      '  });',
      'editor.Parent = panel;',
      "panel.findFirstChild('Editor');",
      'panel.printTree();',
    ],
  },
  {
    tab: 'PROPERTIES',
    eyebrow: '02 / PROPERTIES',
    title: 'Change objects directly.',
    body: 'Assign one property or validate several together. The DOM updates immediately; there is no render pass to schedule.',
    tokens: 'instance.Position  ·  setProperties\nonPropertyChanged',
    lines: [
      'card.Visible = true;',
      'card.setProperties({',
      '  Position: nextPosition,',
      '  Rotation: 3,',
      '});',
    ],
  },
  {
    tab: 'STATE',
    eyebrow: '03 / STATE',
    title: 'Share state when useful.',
    body: 'Values are optional and synchronous. Watch one only when multiple objects need the same source of truth.',
    tokens: 'fk.createValue  ·  instance.watch\nvalue.get  ·  value.set',
    lines: [
      'const count = fk.createValue(0);',
      'label.watch(count, value => {',
      '  label.Text = String(value);',
      '});',
      'count.set(1);',
    ],
  },
  {
    tab: 'MOTION',
    eyebrow: '04 / MOTION',
    title: 'Animate the same properties.',
    body: 'Springs retarget continuously. Tweens provide explicit playback controls without introducing another object model.',
    tokens: 'fka.spring  ·  fka.createTween\nSpringController  ·  Tween',
    lines: ['fka.spring(card, {', '  Position: nextPosition,', '  Rotation: 3,', '});'],
  },
] as const satisfies readonly ApiTopic[];

export function createApi(layout: fk.Value<PlaygroundLayout>): fk.Frame {
  const section = createSection('api', layout, colors.ink);
  const content = createSectionContent(section, layout);
  appendSectionHeading(
    content,
    layout,
    'ONE API. FOUR IDEAS.',
    'The public surface stays small: instances, direct properties, optional shared state, and motion.',
    'light',
  );

  const explorer = fk.createFrame({ Name: 'ApiExplorer', BackgroundTransparency: 1 });
  const selectedTopic = fk.createValue<ApiTopic>(apiTopics[0]);
  bindLayoutProperties(explorer, layout, explorer, {
    desktop: {
      Size: fk.udim2FromOffset(1080, 520),
      Position: fk.udim2FromOffset(0, 242),
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 830),
      Position: fk.udim2FromOffset(0, 246),
    },
  });

  const controls = new Map<ApiTopic, fk.TextButton>();
  for (const [index, topic] of apiTopics.entries()) {
    const control = createButton(
      topic.tab,
      fk.udim2FromOffset(172, 44),
      fk.udim2FromOffset((index % 2) * 186, Math.floor(index / 2) * 58),
      colors.inkRaised,
      colors.text,
    );
    control.setProperties({ TextSize: 9, FontFamily: fonts.mono });
    bindLayoutProperties(explorer, layout, control, {
      desktop: {
        Size: fk.udim2FromOffset(224, 54),
        Position: fk.udim2FromOffset(0, index * 66),
      },
      mobile: {
        Size: fk.udim2FromOffset(172, 44),
        Position: fk.udim2FromOffset((index % 2) * 186, Math.floor(index / 2) * 58),
      },
    });
    fkh.bindHoverScale(control, 1.035);
    control.onClick(() => selectedTopic.set(topic));
    controls.set(topic, control);
    explorer.addChild(control);
  }

  explorer.addChild(createApiTopicPanel(layout, selectedTopic));
  explorer.watch(selectedTopic, (currentTopic) => {
    for (const [topic, control] of controls) {
      const selected = topic === currentTopic;
      control.setProperties({
        BackgroundColor3: selected ? colors.coral : colors.inkRaised,
        TextColor3: selected ? colors.ink : colors.text,
      });
    }
  });

  content.addChild(explorer);
  section.addChild(content);
  return section;
}
