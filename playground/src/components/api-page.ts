import {
  createFrame,
  createUIListLayout,
  type Frame,
  type GuiElement,
  udim,
  udim2,
  udim2FromOffset,
  udim2FromScale,
  type ObservableValue,
  bindTooltip,
} from 'framekit';

import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import type { SitePage } from '../router';
import { fonts, typeScale, type ThemeToken, type ThemeValue } from '../theme';
import { createButton, createSurface, createText } from '../ui';
import {
  appendArticleSection,
  appendArticleTitle,
  appendCallout,
  appendCodeBlock,
  appendOutline,
  appendSidebarGroup,
  createDocsShell,
  createExampleRow,
} from './docs-shell';
import { appendPopoverExamples } from './popover-examples';

export const createApiPage = (
  layout: ObservableValue<PlaygroundLayout>,
  theme: ThemeValue,
  route: ObservableValue<SitePage>,
  scrollTo: (target: GuiElement) => void,
): Frame => {
  const shell = createDocsShell('ApiPage', 'api', layout, theme, route);
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
  );

  const factories = appendArticleSection(
    shell.article,
    theme,
    'Factories',
    'Factories create persistent instances. Initial properties are optional and typed. Every DOM factory accepts { ownerDocument } as a second argument, alongside any tag option.',
  );
  appendCodeBlock(shell.article, theme, 'FactoryCode', [
    { text: 'createScreenGui(properties?)', color: 'accent' },
    { text: 'createFrame(properties?, { tagName? })', color: 'blue' },
    { text: 'createTextLabel(properties?, { textTagName? })', color: 'purple' },
    { text: 'createTextButton(properties?)', color: 'orange' },
    { text: 'createLink(properties?)', color: 'blue' },
    { text: 'createTextInput(properties?)' },
    { text: 'createTextArea(properties?)' },
    { text: 'createImageLabel(properties?, { tagName? })' },
    { text: 'createImageButton(properties?)' },
    { text: 'createScrollingFrame(properties?, { tagName? })' },
  ]);

  const instances = appendArticleSection(
    shell.article,
    theme,
    'Instance methods',
    'Every instance shares hierarchy, inspection, property observation, and lifecycle methods. Use onDestroy to register subscription cleanup.',
  );
  appendCodeBlock(shell.article, theme, 'InstanceMethodsCode', [
    { text: 'node.setProperties(patch)' },
    { text: "node.onPropertyChanged('Visible', listener)" },
    { text: 'child.Parent = node' },
    { text: 'node.Parent = undefined' },
    { text: 'node.getChildren() / getDescendants()' },
    { text: "node.findFirstChild('Name', true)" },
    { text: "child.isA('TextButton')", color: 'blue' },
    { text: 'node.destroy() / isDestroyed()', color: 'orange' },
  ]);

  const elementsSection = appendArticleSection(
    shell.article,
    theme,
    'Elements',
    'Choose the smallest concrete element that owns the behavior you need. All visible elements also inherit the shared GUI properties.',
  );
  const elements = [
    ['ScreenGui', 'Mountable hierarchy root with mount and unmount.', 'accent'],
    ['Frame', 'General container and visual surface.', 'blue'],
    ['TextLabel / Link', 'Display text; Link adds native navigation.', 'purple'],
    ['TextButton', 'TextLabel properties plus typed button events.', 'orange'],
    ['TextInput / TextArea', 'Native editable text with onTextChanged.', 'blue'],
    ['ImageLabel / ImageButton', 'Images with Stretch, Fit, or Crop scaling.', 'accent'],
    ['ScrollingFrame', 'Native scrolling with synchronized canvas position.', 'purple'],
  ] as const satisfies readonly (readonly [string, string, ThemeToken])[];
  appendReferenceCards(shell.article, layout, theme, elements);

  const properties = appendArticleSection(
    shell.article,
    theme,
    'Shared GUI properties',
    'Every rectangular GUI element uses the same geometry, visibility, background, layout, and clipping properties.',
  );
  appendCodeBlock(shell.article, theme, 'GuiPropertiesCode', [
    { text: 'Size / Position: UDim2', color: 'blue' },
    { text: 'AnchorPoint: Vector2' },
    { text: 'Rotation: number' },
    { text: 'Visible: boolean' },
    { text: 'BackgroundColor3: Color3' },
    { text: 'BackgroundTransparency: number' },
    { text: 'ZIndex / LayoutOrder: number' },
    { text: "AutomaticSize: 'None' | 'X' | 'Y' | 'XY'" },
    { text: 'ClipsDescendants: boolean' },
  ]);

  const events = appendArticleSection(
    shell.article,
    theme,
    'Events',
    'All GUI elements support pointer entry and exit. Buttons add mouse-button events, while native text controls add user-edit events.',
  );
  appendCodeBlock(shell.article, theme, 'EventsApiCode', [
    { text: 'node.onMouseEnter(listener)' },
    { text: 'node.onMouseLeave(listener)' },
    { text: 'button.onClick(listener)', color: 'accent' },
    { text: 'button.onPrimaryButtonDown(listener)' },
    { text: 'button.onPrimaryButtonUp(listener)' },
    { text: 'button.onSecondaryClick(listener)' },
    { text: 'textControl.onTextChanged(listener)', color: 'blue' },
  ]);

  const values = appendArticleSection(
    shell.article,
    theme,
    'Values and signals',
    'Values model mutable state. Signals model typed events. Register the unsubscribe function with owner.onDestroy to release a subscription when its owner is destroyed.',
  );
  appendCodeBlock(shell.article, theme, 'ValuesApiCode', [
    { text: 'const value = createObservableValue(initial);', color: 'purple' },
    { text: 'value.get()' },
    { text: 'value.set(next)' },
    { text: 'owner.onDestroy(value.onChange(listener))', color: 'accent' },
    { text: '' },
    { text: 'const event = createSignalEmitter<[number]>();' },
    { text: 'event.subscribe(listener)' },
    { text: 'event.emit(42)' },
  ]);

  const modifiersSection = appendArticleSection(
    shell.article,
    theme,
    'Modifiers',
    'Attach focused layout or appearance behavior as children. A modifier belongs to the same hierarchy and cleanup model as every other instance.',
  );
  const modifiers = [
    ['UICorner', 'Rounded corners using CornerRadius.', 'accent'],
    ['UIStroke', 'Inner, center, or outer borders.', 'blue'],
    ['UITextStroke', 'Adjustable outlines around rendered text.', 'purple'],
    ['UIPadding', 'Independent top, right, bottom, and left padding.', 'purple'],
    ['UIListLayout', 'Horizontal or vertical ordered child layout.', 'orange'],
    ['UIGradient', 'Color and transparency sequences.', 'accent'],
    ['UIScale', 'Uniform visual scaling for a subtree.', 'blue'],
    ['UIShadow', 'Configurable shadow color, blur, and offset.', 'purple'],
    ['UIAspectRatioConstraint', 'Keeps a stable width-to-height ratio.', 'orange'],
  ] as const satisfies readonly (readonly [string, string, ThemeToken])[];
  appendReferenceCards(shell.article, layout, theme, modifiers);

  const animation = appendArticleSection(
    shell.article,
    theme,
    'Animation',
    'Tween provides timed playback controls. Spring retains one controller per instance so retargeting shares velocity and avoids overlapping writers.',
  );
  appendCodeBlock(shell.article, theme, 'AnimationApiCode', [
    { text: 'const tween = createTween(card, {' },
    { text: '  Duration: 0.3,' },
    { text: "  EasingStyle: 'Quad'," },
    { text: '}, { Rotation: 12 });' },
    { text: 'tween.play();', color: 'blue' },
    { text: '' },
    { text: 'spring(card, { Rotation: 0 });', color: 'purple' },
    { text: "spring(card).stop('Rotation');" },
  ]);
  appendCallout(
    shell.article,
    theme,
    '🎯 Assigning card.Rotation directly stops the current Rotation animation, even when the assigned value is unchanged.',
  );

  const helpers = appendArticleSection(
    shell.article,
    theme,
    'Helpers',
    'Helpers are named exports that compose optional behavior from the same core instances.',
  );
  appendCodeBlock(shell.article, theme, 'HelpersApiCode', [
    { text: 'bindResponsiveLayout(owner, { observe, breakpoints })' },
    { text: 'bindHoverScale(node, scale, 1.035)' },
    { text: '' },
    { text: "const dispose = bindTooltip(button, 'Save');", color: 'accent' },
    { text: "bindTooltip(button, 'Inspect', { followCursor: true });" },
    { text: 'bindTooltip(button, detachedFrame, { followCursor: true });' },
    { text: '// Options: placement, followCursor, delay, gap, style' },
    { text: '// Animation hooks: onShow, onHide' },
    { text: 'dispose(); // Target destruction also releases the binding.' },
  ]);
  appendArticleSection(
    shell.article,
    theme,
    'Try tooltips',
    'Hover or focus a button. Cursor tooltips fade on exit; focused tooltips stay anchored. Escape dismisses them.',
  );
  appendTooltipExamples(shell.article, layout, theme);
  const popovers = appendPopoverExamples(shell.article, layout, theme);
  const coreItems = [
    { label: 'Factories', target: factories, active: true },
    { label: 'Instances', target: instances },
    { label: 'Elements', target: elementsSection },
    { label: 'Properties', target: properties },
  ];
  const behaviorItems = [
    { label: 'Events', target: events },
    { label: 'Values', target: values },
  ];
  const optionalItems = [
    { label: 'Modifiers', target: modifiersSection },
    { label: 'Animation', target: animation },
    { label: 'Helpers', target: helpers },
    { label: 'Popovers', target: popovers },
  ];
  appendSidebarGroup(shell.sidebar, theme, 'CORE API', coreItems, 0, scrollTo);
  appendSidebarGroup(shell.sidebar, theme, 'STATE AND INPUT', behaviorItems, 220, scrollTo);
  appendSidebarGroup(shell.sidebar, theme, 'OPTIONAL MODULES', optionalItems, 350, scrollTo);
  appendOutline(shell.outline, theme, [...coreItems, ...behaviorItems, ...optionalItems], scrollTo);
  return shell.page;
};

const appendTooltipExamples = (
  article: Frame,
  layout: ObservableValue<PlaygroundLayout>,
  theme: ThemeValue,
): void => {
  const row = createExampleRow(article, layout);
  const buttons = ['Anchored text', 'Follow cursor', 'Custom Frame'].map((label, index) => {
    const button = createButton(theme, {
      label,
      name: `TooltipExample${index + 1}`,
      position: udim2FromOffset(0, 0),
      size: udim2FromOffset(216, 44),
    });
    bindLayoutProperties(button, layout, button, {
      desktop: {
        Size: udim2FromOffset(216, 44),
      },
      mobile: {
        Size: udim2FromOffset(358, 44),
      },
    });
    button.Parent = row;
    return button;
  });
  bindTooltip(buttons[0]!, 'I stay above this button. You can hover over me.');
  bindTooltip(buttons[1]!, 'I follow the pointer and fade when you leave.', {
    followCursor: true,
  });
  const custom = createSurface(theme, {
    name: 'CustomTooltip',
    size: udim2FromOffset(260, 100),
    background: 'surfaceRaised',
    radius: 12,
  });
  createText(theme, {
    text: 'Your own Frame',
    size: udim2FromOffset(232, 26),
    position: udim2FromOffset(14, 10),
    color: 'accent',
    weight: 800,
  }).Parent = custom;
  createText(theme, {
    text: 'Custom layout and theme colors.\nFades as soon as you leave.',
    size: udim2FromOffset(232, 48),
    position: udim2FromOffset(14, 40),
    color: 'textMuted',
    textSize: typeScale.small,
    wrapped: true,
  }).Parent = custom;
  const customButton = buttons[2]!;
  bindTooltip(customButton, custom, { followCursor: true });
  // Supplied content remains caller-owned after the binding is released.
  customButton.onDestroy(() => custom.destroy());
};

const appendReferenceCards = (
  parent: Frame,
  layout: ObservableValue<PlaygroundLayout>,
  theme: ThemeValue,
  items: readonly (readonly [string, string, ThemeToken])[],
): void => {
  const cards = createFrame({
    Name: 'ReferenceCards',
    Size: udim2FromScale(1, 0),
    AutomaticSize: 'Y',
    BackgroundTransparency: 1,
  });
  createUIListLayout({ Padding: udim(0, 12) }).Parent = cards;
  for (const [name, description, color] of items) {
    createReferenceCard(layout, theme, name, description, color).Parent = cards;
  }
  cards.Parent = parent;
};

const createReferenceCard = (
  layout: ObservableValue<PlaygroundLayout>,
  theme: ThemeValue,
  name: string,
  description: string,
  color: ThemeToken,
): Frame => {
  const card = createSurface(theme, {
    name: `${name.replaceAll(/\W+/g, '')}ReferenceCard`,
    size: udim2(1, 0, 0, 68),
    background: 'surface',
    radius: 10,
  });
  const title = createText(theme, {
    text: name,
    size: udim2FromOffset(220, 40),
    position: udim2FromOffset(18, 14),
    color,
    textSize: typeScale.small,
    font: fonts.mono,
    weight: 800,
  });
  const body = createText(theme, {
    text: description,
    size: udim2(1, -274, 1, -20),
    position: udim2FromOffset(256, 10),
    color: 'textMuted',
    textSize: typeScale.small,
    wrapped: true,
  });
  bindLayoutProperties(card, layout, title, {
    desktop: { Size: udim2FromOffset(220, 40), Position: udim2FromOffset(18, 14) },
    mobile: { Size: udim2(1, -28, 0, 20), Position: udim2FromOffset(14, 8) },
  });
  bindLayoutProperties(card, layout, body, {
    desktop: {
      Size: udim2(1, -274, 1, -20),
      Position: udim2FromOffset(256, 10),
      TextSize: typeScale.small,
    },
    mobile: {
      Size: udim2(1, -28, 0, 34),
      Position: udim2FromOffset(14, 30),
      TextSize: typeScale.caption,
    },
  });
  title.Parent = card;
  body.Parent = card;
  return card;
};
