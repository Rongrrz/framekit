import { fk } from 'framekit';

import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import type { SitePage } from '../router';
import { fonts, typeScale, type ThemeToken, type ThemeValue } from '../theme';
import { createSurface, createText } from '../ui';
import {
  appendArticleSection,
  appendArticleTitle,
  appendCallout,
  appendCodeBlock,
  appendOutline,
  appendSidebarGroup,
  createDocsShell,
} from './docs-shell';

const coreItems = [
  { label: 'Factories', offset: 0, active: true },
  { label: 'Instances', offset: 660 },
  { label: 'Elements', offset: 1080 },
  { label: 'Properties', offset: 1760 },
] as const;
const behaviorItems = [
  { label: 'Events', offset: 2240 },
  { label: 'Values', offset: 2660 },
] as const;
const optionalItems = [
  { label: 'Modifiers', offset: 3040 },
  { label: 'Animation', offset: 3860 },
  { label: 'Helpers', offset: 4400 },
] as const;
const outlineItems = [...coreItems, ...behaviorItems, ...optionalItems] as const;

export const createApiPage = (
  layout: fk.Value<PlaygroundLayout>,
  theme: ThemeValue,
  route: fk.Value<SitePage>,
  scrollTo: (offset: number) => void,
): fk.Frame => {
  const shell = createDocsShell('ApiPage', 'api', layout, route);
  appendSidebarGroup(shell.sidebar, theme, 'CORE API', coreItems, 0, scrollTo);
  appendSidebarGroup(shell.sidebar, theme, 'STATE AND INPUT', behaviorItems, 220, scrollTo);
  appendSidebarGroup(shell.sidebar, theme, 'OPTIONAL MODULES', optionalItems, 350, scrollTo);
  appendOutline(shell.outline, theme, outlineItems, scrollTo);

  appendArticleTitle(
    shell.article,
    theme,
    'API REFERENCE',
    'FrameKit API',
    'A practical map of the APIs used to create, update, connect, animate, and clean up an interface.',
  );
  appendCallout(
    shell.article,
    theme,
    '📘 All public factories and properties are typed. Your editor remains the most exact reference.',
    220,
  );

  appendArticleSection(
    shell.article,
    theme,
    'Factories',
    'Factories create persistent instances. Every initial properties object is optional and type checked.',
    310,
  );
  appendCodeBlock(
    shell.article,
    theme,
    'FactoryCode',
    [
      { text: 'fk.createScreenGui(properties?)', color: 'accent' },
      { text: 'fk.createFrame(properties?)', color: 'blue' },
      { text: 'fk.createTextLabel(properties?)', color: 'purple' },
      { text: 'fk.createTextButton(properties?)', color: 'orange' },
      { text: 'fk.createTextBox(properties?)' },
      { text: 'fk.createImageLabel(properties?)' },
      { text: 'fk.createImageButton(properties?)' },
      { text: 'fk.createScrollingFrame(properties?)' },
    ],
    430,
    260,
  );

  appendArticleSection(
    shell.article,
    theme,
    'Instance methods',
    'Every instance shares hierarchy, inspection, property observation, value binding, and lifecycle methods.',
    748,
  );
  appendCodeBlock(
    shell.article,
    theme,
    'InstanceMethodsCode',
    [
      { text: 'node.setProperties(patch)' },
      { text: "node.onPropertyChanged('Visible', listener)" },
      { text: 'node.addChild(child)' },
      { text: 'node.removeFromParent()' },
      { text: 'node.getChildren() / getDescendants()' },
      { text: "node.findFirstChild('Name', true)" },
      { text: 'node.watch(value, listener)', color: 'blue' },
      { text: 'node.destroy() / isDestroyed()', color: 'orange' },
    ],
    870,
    260,
  );

  appendArticleSection(
    shell.article,
    theme,
    'Elements',
    'Choose the smallest concrete element that owns the behavior you need. All visible elements also inherit the shared GUI properties.',
    1188,
  );
  const elements = [
    ['ScreenGui', 'Mountable hierarchy root with mount and unmount.', 'accent'],
    ['Frame', 'General container and visual surface.', 'blue'],
    ['TextLabel', 'Text display with wrapping, alignment, and TextScaled.', 'purple'],
    ['TextButton', 'TextLabel properties plus typed button events.', 'orange'],
    ['TextBox', 'Editable text with onTextChanged.', 'blue'],
    ['ImageLabel / ImageButton', 'Images with Stretch, Fit, or Crop scaling.', 'accent'],
    ['ScrollingFrame', 'Native scrolling with synchronized canvas position.', 'purple'],
  ] as const satisfies readonly (readonly [string, string, ThemeToken])[];
  appendReferenceCards(shell.article, layout, theme, elements, 1320);

  appendArticleSection(
    shell.article,
    theme,
    'Shared GUI properties',
    'Every rectangular GUI element uses the same geometry, visibility, background, layout, and clipping properties.',
    1954,
  );
  appendCodeBlock(
    shell.article,
    theme,
    'GuiPropertiesCode',
    [
      { text: 'Size / Position: UDim2', color: 'blue' },
      { text: 'AnchorPoint: Vector2' },
      { text: 'Rotation: number' },
      { text: 'Visible: boolean' },
      { text: 'BackgroundColor3: Color3' },
      { text: 'BackgroundTransparency: number' },
      { text: 'ZIndex / LayoutOrder: number' },
      { text: "AutomaticSize: 'None' | 'X' | 'Y' | 'XY'" },
      { text: 'ClipsDescendants: boolean' },
    ],
    2078,
    286,
  );

  appendArticleSection(
    shell.article,
    theme,
    'Events',
    'All GUI elements support pointer entry and exit. Buttons add mouse-button events, while TextBox adds user-edit events.',
    2422,
  );
  appendCodeBlock(
    shell.article,
    theme,
    'EventsApiCode',
    [
      { text: 'node.onMouseEnter(listener)' },
      { text: 'node.onMouseLeave(listener)' },
      { text: 'button.onClick(listener)', color: 'accent' },
      { text: 'button.onPrimaryButtonDown(listener)' },
      { text: 'button.onPrimaryButtonUp(listener)' },
      { text: 'button.onSecondaryClick(listener)' },
      { text: 'textBox.onTextChanged(listener)', color: 'blue' },
    ],
    2546,
    234,
  );

  appendArticleSection(
    shell.article,
    theme,
    'Values and signals',
    'Values model mutable state. Signals model typed events. Both return explicit subscriptions, while instance.watch adds owner-based cleanup.',
    2838,
  );
  appendCodeBlock(
    shell.article,
    theme,
    'ValuesApiCode',
    [
      { text: 'const value = fk.createValue(initial);', color: 'purple' },
      { text: 'value.get()' },
      { text: 'value.set(next)' },
      { text: 'owner.watch(value, listener)', color: 'accent' },
      { text: '' },
      { text: 'const event = fk.createSignal<[number]>();' },
      { text: 'event.subscribe(listener)' },
      { text: 'event.emit(42)' },
    ],
    2968,
    260,
  );

  appendArticleSection(
    shell.article,
    theme,
    'Modifiers',
    'Attach focused layout or appearance behavior as children. A modifier belongs to the same hierarchy and cleanup model as every other instance.',
    3286,
  );
  const modifiers = [
    ['UICorner', 'Rounded corners using CornerRadius.', 'accent'],
    ['UIStroke', 'Inner, center, or outer borders.', 'blue'],
    ['UIPadding', 'Independent top, right, bottom, and left padding.', 'purple'],
    ['UIListLayout', 'Horizontal or vertical ordered child layout.', 'orange'],
    ['UIGradient', 'Color and transparency sequences.', 'accent'],
    ['UIScale', 'Uniform visual scaling for a subtree.', 'blue'],
    ['UIShadow', 'Configurable shadow color, blur, and offset.', 'purple'],
    ['UIAspectRatioConstraint', 'Keeps a stable width-to-height ratio.', 'orange'],
  ] as const satisfies readonly (readonly [string, string, ThemeToken])[];
  appendReferenceCards(shell.article, layout, theme, modifiers, 3420);

  appendArticleSection(
    shell.article,
    theme,
    'Animation',
    'Tween provides timed playback controls. Spring retains one controller per instance so retargeting shares velocity and avoids overlapping writers.',
    4256,
  );
  appendCodeBlock(
    shell.article,
    theme,
    'AnimationApiCode',
    [
      { text: 'const tween = fka.createTween(card, {' },
      { text: '  Duration: 0.3,' },
      { text: "  EasingStyle: 'Quad'," },
      { text: '}, { Rotation: 12 });' },
      { text: 'tween.play();', color: 'blue' },
      { text: '' },
      { text: 'fka.spring(card, { Rotation: 0 });', color: 'purple' },
      { text: "fka.spring(card).stop('Rotation');" },
    ],
    4390,
    260,
  );
  appendCallout(
    shell.article,
    theme,
    '🎯 Assigning card.Rotation directly stops the current Rotation animation, even when the assigned value is unchanged.',
    4696,
  );

  appendArticleSection(
    shell.article,
    theme,
    'Helpers',
    'The fkh namespace contains optional behavior built on core instances. It does not add extra support code to fk.',
    4816,
  );
  appendCodeBlock(
    shell.article,
    theme,
    'HelpersApiCode',
    [
      { text: 'fkh.bindResponsiveLayout(owner, options)' },
      { text: 'fkh.bindHoverScale(node, 1.035)' },
      { text: 'fkh.setModifierAttached(modifier, true)' },
    ],
    4942,
    124,
  );
  return shell.page;
};

const appendReferenceCards = (
  parent: fk.Frame,
  layout: fk.Value<PlaygroundLayout>,
  theme: ThemeValue,
  items: readonly (readonly [string, string, ThemeToken])[],
  startY: number,
): void => {
  for (const [index, [name, description, color]] of items.entries()) {
    parent.addChild(
      createReferenceCard(layout, theme, name, description, color, startY + index * 82),
    );
  }
};

const createReferenceCard = (
  layout: fk.Value<PlaygroundLayout>,
  theme: ThemeValue,
  name: string,
  description: string,
  color: ThemeToken,
  y: number,
): fk.Frame => {
  const card = createSurface(theme, {
    name: `${name.replaceAll(/\W+/g, '')}ReferenceCard`,
    size: fk.udim2(1, 0, 0, 68),
    position: fk.udim2FromOffset(0, y),
    background: 'surface',
    radius: 10,
  });
  const title = createText(theme, {
    text: name,
    size: fk.udim2FromOffset(184, 40),
    position: fk.udim2FromOffset(18, 14),
    color,
    textSize: typeScale.small,
    font: fonts.mono,
    weight: 800,
  });
  const body = createText(theme, {
    text: description,
    size: fk.udim2(1, -226, 1, -20),
    position: fk.udim2FromOffset(208, 10),
    color: 'textMuted',
    textSize: typeScale.small,
    wrapped: true,
  });
  bindLayoutProperties(card, layout, title, {
    desktop: { Size: fk.udim2FromOffset(184, 40), Position: fk.udim2FromOffset(18, 14) },
    mobile: { Size: fk.udim2FromOffset(140, 40), Position: fk.udim2FromOffset(14, 14) },
  });
  bindLayoutProperties(card, layout, body, {
    desktop: { Size: fk.udim2(1, -226, 1, -20), Position: fk.udim2FromOffset(208, 10) },
    mobile: { Size: fk.udim2(1, -174, 1, -16), Position: fk.udim2FromOffset(164, 8) },
  });
  card.addChild(title);
  card.addChild(body);
  return card;
};
