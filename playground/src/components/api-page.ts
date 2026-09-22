import { fk, fkh } from 'framekit';

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
  layout: fk.Value<PlaygroundLayout>,
  theme: ThemeValue,
  route: fk.Value<SitePage>,
  scrollTo: (target: fk.GuiElement) => void,
): fk.Frame => {
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
    { text: 'fk.createScreenGui(properties?)', color: 'accent' },
    { text: 'fk.createFrame(properties?, { tagName? })', color: 'blue' },
    { text: 'fk.createTextLabel(properties?, { textTagName? })', color: 'purple' },
    { text: 'fk.createTextButton(properties?)', color: 'orange' },
    { text: 'fk.createLink(properties?)', color: 'blue' },
    { text: 'fk.createTextInput(properties?)' },
    { text: 'fk.createTextArea(properties?)' },
    { text: 'fk.createImageLabel(properties?, { tagName? })' },
    { text: 'fk.createImageButton(properties?)' },
    { text: 'fk.createScrollingFrame(properties?, { tagName? })' },
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
    { text: 'const value = fk.createValue(initial);', color: 'purple' },
    { text: 'value.get()' },
    { text: 'value.set(next)' },
    { text: 'owner.onDestroy(value.onChange(listener))', color: 'accent' },
    { text: '' },
    { text: 'const event = fk.createSignal<[number]>();' },
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
    { text: 'const tween = fka.createTween(card, {' },
    { text: '  Duration: 0.3,' },
    { text: "  EasingStyle: 'Quad'," },
    { text: '}, { Rotation: 12 });' },
    { text: 'tween.play();', color: 'blue' },
    { text: '' },
    { text: 'fka.spring(card, { Rotation: 0 });', color: 'purple' },
    { text: "fka.spring(card).stop('Rotation');" },
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
    'The fkh namespace contains optional behavior built on core instances. It does not add extra support code to fk.',
  );
  appendCodeBlock(shell.article, theme, 'HelpersApiCode', [
    { text: 'fkh.bindResponsiveLayout(owner, options)' },
    { text: 'fkh.bindHoverScale(node, scale, 1.035)' },
    { text: '' },
    { text: "const dispose = fkh.withToolTip(button, 'Save');", color: 'accent' },
    { text: "fkh.withToolTip(button, 'Inspect', { followCursor: true });" },
    { text: 'fkh.withToolTip(button, detachedFrame, { followCursor: true });' },
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
  appendToolTipExamples(shell.article, layout, theme);
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

const appendToolTipExamples = (
  article: fk.Frame,
  layout: fk.Value<PlaygroundLayout>,
  theme: ThemeValue,
): void => {
  const row = createExampleRow(article, layout);
  const buttons = ['Anchored text', 'Follow cursor', 'Custom Frame'].map((label, index) => {
    const button = createButton(theme, {
      label,
      name: `ToolTipExample${index + 1}`,
      position: fk.udim2FromOffset(0, 0),
      size: fk.udim2FromOffset(216, 44),
    });
    bindLayoutProperties(button, layout, button, {
      desktop: {
        Size: fk.udim2FromOffset(216, 44),
      },
      mobile: {
        Size: fk.udim2FromOffset(358, 44),
      },
    });
    button.Parent = row;
    return button;
  });
  fkh.withToolTip(buttons[0]!, 'I stay above this button. You can hover over me.');
  fkh.withToolTip(buttons[1]!, 'I follow the pointer and fade when you leave.', {
    followCursor: true,
  });
  const custom = createSurface(theme, {
    name: 'CustomToolTip',
    size: fk.udim2FromOffset(260, 100),
    background: 'surfaceRaised',
    radius: 12,
  });
  createText(theme, {
    text: 'Your own Frame',
    size: fk.udim2FromOffset(232, 26),
    position: fk.udim2FromOffset(14, 10),
    color: 'accent',
    weight: 800,
  }).Parent = custom;
  createText(theme, {
    text: 'Custom layout and theme colors.\nFades as soon as you leave.',
    size: fk.udim2FromOffset(232, 48),
    position: fk.udim2FromOffset(14, 40),
    color: 'textMuted',
    textSize: typeScale.small,
    wrapped: true,
  }).Parent = custom;
  const customButton = buttons[2]!;
  fkh.withToolTip(customButton, custom, { followCursor: true });
  // Supplied content remains caller-owned after the binding is released.
  customButton.onDestroy(() => custom.destroy());
};

const appendReferenceCards = (
  parent: fk.Frame,
  layout: fk.Value<PlaygroundLayout>,
  theme: ThemeValue,
  items: readonly (readonly [string, string, ThemeToken])[],
): void => {
  const cards = fk.createFrame({
    Name: 'ReferenceCards',
    Size: fk.udim2FromScale(1, 0),
    AutomaticSize: 'Y',
    BackgroundTransparency: 1,
  });
  fk.createUIListLayout({ Padding: fk.udim(0, 12) }).Parent = cards;
  for (const [name, description, color] of items) {
    createReferenceCard(layout, theme, name, description, color).Parent = cards;
  }
  cards.Parent = parent;
};

const createReferenceCard = (
  layout: fk.Value<PlaygroundLayout>,
  theme: ThemeValue,
  name: string,
  description: string,
  color: ThemeToken,
): fk.Frame => {
  const card = createSurface(theme, {
    name: `${name.replaceAll(/\W+/g, '')}ReferenceCard`,
    size: fk.udim2(1, 0, 0, 68),
    background: 'surface',
    radius: 10,
  });
  const title = createText(theme, {
    text: name,
    size: fk.udim2FromOffset(220, 40),
    position: fk.udim2FromOffset(18, 14),
    color,
    textSize: typeScale.small,
    font: fonts.mono,
    weight: 800,
  });
  const body = createText(theme, {
    text: description,
    size: fk.udim2(1, -274, 1, -20),
    position: fk.udim2FromOffset(256, 10),
    color: 'textMuted',
    textSize: typeScale.small,
    wrapped: true,
  });
  bindLayoutProperties(card, layout, title, {
    desktop: { Size: fk.udim2FromOffset(220, 40), Position: fk.udim2FromOffset(18, 14) },
    mobile: { Size: fk.udim2(1, -28, 0, 20), Position: fk.udim2FromOffset(14, 8) },
  });
  bindLayoutProperties(card, layout, body, {
    desktop: {
      Size: fk.udim2(1, -274, 1, -20),
      Position: fk.udim2FromOffset(256, 10),
      TextSize: typeScale.small,
    },
    mobile: {
      Size: fk.udim2(1, -28, 0, 34),
      Position: fk.udim2FromOffset(14, 30),
      TextSize: typeScale.caption,
    },
  });
  title.Parent = card;
  body.Parent = card;
  return card;
};
