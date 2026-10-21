import {
  setAccessibility,
  bindCheckbox,
  bindSlider,
  bindTabs,
  bindDialog,
  bindMenu,
  bindTreeView,
  createFrame,
  createObservableValue,
  createUIListLayout,
  createUICorner,
  createUIShadow,
  createUIPadding,
  watchOwnedValue,
  type Frame,
  type GuiElement,
  type ObservableValue,
  type TreeViewItem,
  udim,
  vector2,
  udim2,
  udim2FromOffset,
} from 'framekit';

import composedHelpersExample from '../../examples/controls/composed-helpers.ts?example';
import dialogBindingExample from '../../examples/controls/dialog-binding.ts?example';
import menuBindingExample from '../../examples/controls/menu-binding.ts?example';
import treeBindingExample from '../../examples/controls/tree-binding.ts?example';
import type { SitePage } from '../router';
import { bindThemeColors, type ThemeValue } from '../theme';
import { createButton, createSurface, createText } from '../ui';
import { createCodeBlock } from './code-block';
import {
  appendArticleSection,
  appendArticleTitle,
  appendCallout,
  appendOutline,
  appendPageNavigation,
  createDocsShell,
} from './docs-shell';

/** Native controls and a caller-owned tree demonstrate keyboard and lifetime contracts. */
export const createControlsPage = (
  theme: ThemeValue,
  route: ObservableValue<SitePage>,
  scrollTo: (target: GuiElement) => void,
): Frame => {
  const shell = createDocsShell('ControlsPage', 'controls', theme, route);
  appendArticleTitle(
    shell.article,
    theme,
    'BUILD / CONTROLS',
    'Menus, dialogs & trees',
    'Try each example with the keyboard. Bindings add behavior to your instances; your application owns their content and state.',
  );

  const status = createText(theme, {
    text: 'Choose a command or select a tree item.',
    size: udim2(1, 0, 0, 40),
    wrapped: true,
  });

  setAccessibility(status, { role: 'status' });

  const menuHeading = appendArticleSection(
    shell.article,
    theme,
    'Command menus',
    'Click Actions or press Arrow Down on it. Arrow keys skip disabled commands; Home, End, and typing move focus. Enter or Space activates a command. Escape returns focus to the trigger; clicking outside dismisses the menu.',
  );

  const trigger = createButton(theme, {
    label: 'Example actions',
    size: udim2FromOffset(200, 44),
    position: udim2FromOffset(0, 0),
  });

  trigger.Parent = shell.article;

  const menu = createSurface(theme, {
    name: 'ExampleCommandMenu',
    size: udim2FromOffset(200, 132),
  });

  menu.Parent = shell.page;
  createUIListLayout().Parent = menu;

  const commands = ['Copy item', 'Unavailable', 'Archive item'].map((label) => {
    const command = createButton(theme, {
      label,
      size: udim2FromOffset(200, 44),
      position: udim2FromOffset(0, 0),
    });

    command.Disabled = label === 'Unavailable';
    command.onClick(() => {
      status.Text = `${label} selected.`;
    });
    command.Parent = menu;

    return command;
  });

  const menuBinding = bindMenu(trigger, menu, commands);
  createCodeBlock(theme, 'MenuBindingCode', menuBindingExample).Parent = shell.article;

  const dialogHeading = appendArticleSection(
    shell.article,
    theme,
    'Modal dialogs',
    'Open the labeled native dialog. Tab stays inside it while the background is inert. Escape or Close returns focus to the opener. initialFocus must be a live descendant.',
  );

  const opener = createButton(theme, {
    label: 'Open example dialog',
    size: udim2FromOffset(220, 44),
    position: udim2FromOffset(0, 0),
  });

  opener.Parent = shell.article;

  const dialog = createFrame({
    TagName: 'dialog',
    Size: udim2FromOffset(300, 180),
    Position: udim2(0.5, 0, 0.5, 0),
    AnchorPoint: vector2(0.5, 0.5),
  });

  createUICorner({ CornerRadius: 16 }).Parent = dialog;
  createUIShadow({ Offset: vector2(0, 24), BlurRadius: 80, Transparency: 0.73 }).Parent = dialog;
  setAccessibility(dialog, { label: 'Example dialog' });
  bindThemeColors(dialog, theme, (palette) => ({ BackgroundColor3: palette.surfaceRaised }));
  dialog.Parent = shell.page;
  createText(theme, {
    text: 'Background interaction is paused.\nClose to return to the opener.',
    wrapped: true,
    size: udim2FromOffset(268, 80),
    position: udim2FromOffset(16, 16),
  }).Parent = dialog;

  const close = createButton(theme, {
    label: 'Close example dialog',
    size: udim2FromOffset(268, 44),
    position: udim2FromOffset(16, 112),
  });

  close.Parent = dialog;

  const modal = bindDialog(dialog, { initialFocus: close });
  opener.onClick(() => modal.open(opener));
  close.onClick(modal.close);
  createCodeBlock(theme, 'DialogBindingCode', dialogBindingExample).Parent = shell.article;

  const treeHeading = appendArticleSection(
    shell.article,
    theme,
    'Tree navigation',
    'Tab into the tree. Up and Down move focus without selecting; Enter or Space selects. Left collapses a branch or goes to its parent; Right expands or enters it. Type a label to find it. Selection and expansion are application state.',
  );

  const tree = createSurface(theme, { name: 'ExampleTree', size: udim2(1, 0, 0, 132) });
  setAccessibility(tree, { label: 'Example files' });
  tree.Parent = shell.article;
  createUIListLayout().Parent = tree;

  const rows = ['Project', 'Readme', 'Source'].map((label, index) => {
    const row = createButton(theme, {
      label,
      size: udim2(1, 0, 0, 44),
      position: udim2FromOffset(0, 0),
    });

    row.TextXAlignment = 'Left';
    createUIPadding({ PaddingLeft: udim(0, index === 0 ? 12 : 28) }).Parent = row;
    row.Parent = tree;

    return { node: row, label, level: index === 0 ? 1 : 2 };
  });

  let expanded = true;
  let selected: GuiElement | undefined;
  const source = createObservableValue<readonly TreeViewItem[]>([]);

  const publish = (): void => {
    rows.forEach(({ node }, index) => {
      node.Visible = index === 0 || expanded;
      node.BackgroundTransparency = node === selected ? 0 : 1;
      node.FontWeight = node === selected ? 800 : 450;
    });

    source.set(
      rows
        .filter((_, index) => index === 0 || expanded)
        .map((item, index) => ({
          ...item,
          selected: item.node === selected,
          ...(index === 0 ? { expanded } : {}),
        })),
    );
  };

  publish();

  const stopTree = bindTreeView(tree, source, {
    onSelect: (node) => {
      selected = node;
      status.Text = `Selected ${rows.find((item) => item.node === node)!.label}.`;
      publish();
    },

    onToggle: (_, next) => {
      expanded = next;
      publish();
    },
  });

  createCodeBlock(theme, 'TreeBindingCode', treeBindingExample).Parent = shell.article;

  const helpersHeading = appendArticleSection(
    shell.article,
    theme,
    'Checkboxes, sliders & tabs',
    'Helpers compose existing instances. This checkbox and slider thumb are TextButtons; tab panels are Frames. Your observable values own state and your objects own appearance. Space toggles the checkbox; arrows change the slider or activate another tab.',
  );

  const checked = createObservableValue(false);
  const checkbox = createButton(theme, {
    label: 'Shadows disabled',
    size: udim2FromOffset(220, 44),
    position: udim2FromOffset(0, 0),
  });
  checkbox.AccessibleLabel = 'Enable shadows';
  checkbox.Parent = shell.article;
  const stopCheckbox = bindCheckbox(checkbox, checked);
  watchOwnedValue(checkbox, checked, (enabled) => {
    checkbox.Text = enabled ? '✓ Shadows enabled' : 'Shadows disabled';
  });

  const volume = createObservableValue(50);
  const volumeLabel = createText(theme, { text: '', size: udim2(1, 0, 0, 32) });
  volumeLabel.Parent = shell.article;
  watchOwnedValue(volumeLabel, volume, (value) => {
    volumeLabel.Text = `Volume: ${value}`;
  });
  const sliderSurface = createFrame({
    Name: 'VolumeSlider',
    Size: udim2(1, 0, 0, 52),
    BackgroundTransparency: 1,
  });
  sliderSurface.Parent = shell.article;
  const track = createSurface(theme, {
    name: 'VolumeTrack',
    size: udim2(1, -32, 0, 12),
    position: udim2FromOffset(16, 20),
    radius: 6,
  });
  track.Parent = sliderSurface;
  const thumb = createButton(theme, {
    label: '',
    size: udim2FromOffset(28, 36),
    position: udim2FromOffset(0, 0),
    background: 'accent',
  });
  thumb.AccessibleLabel = 'Example volume';
  thumb.Parent = track;
  const stopSlider = bindSlider(track, thumb, { value: volume, step: 5 });

  const tablist = createFrame({
    Name: 'SettingsTabs',
    Size: udim2(1, 0, 0, 44),
    BackgroundTransparency: 1,
  });
  setAccessibility(tablist, { label: 'Example settings' });
  tablist.Parent = shell.article;
  const selection = createObservableValue('General');
  const tabs = ['General', 'Advanced'].map((key, index) => {
    const tab = createButton(theme, {
      label: key,
      size: udim2FromOffset(120, 44),
      position: udim2FromOffset(index * 128, 0),
    });
    tab.Parent = tablist;
    const panel = createSurface(theme, {
      name: `${key}Panel`,
      size: udim2(1, 0, 0, 72),
      radius: 12,
    });
    panel.Parent = shell.article;
    createText(theme, {
      text: `${key} settings stay alive when you switch tabs.`,
      wrapped: true,
      size: udim2(1, -24, 1, -16),
      position: udim2FromOffset(12, 8),
    }).Parent = panel;
    watchOwnedValue(tab, selection, (value) => {
      tab.FontWeight = value === key ? 800 : 450;
    });

    return { key, tab, panel };
  });
  const stopTabs = bindTabs(tablist, tabs, { selection });
  createCodeBlock(theme, 'ComposedHelpersCode', composedHelpersExample).Parent = shell.article;
  status.Parent = shell.article;

  const release = createButton(theme, {
    label: 'Release example bindings',
    size: udim2FromOffset(260, 44),
    position: udim2FromOffset(0, 0),
  });

  release.Parent = shell.article;
  release.onClick(() => {
    menuBinding.dispose();
    modal.dispose();
    stopTree();
    stopCheckbox();
    stopSlider();
    stopTabs();
    menu.Visible = false;
    opener.Disabled = true;
    trigger.Disabled = true;
    release.Disabled = true;
    status.Text = 'Bindings released; content remains. Reload to try again.';
  });

  appendCallout(
    shell.article,
    theme,
    'Destroying the trigger, menu, dialog, or tree also releases its binding. Keep supplied instances under your application root so destroying the application releases their content.',
  );

  appendOutline(
    shell.outline,
    theme,
    [
      { label: 'Menus', target: menuHeading },
      { label: 'Dialogs', target: dialogHeading },
      { label: 'Trees', target: treeHeading },
      { label: 'Composed controls', target: helpersHeading },
    ],
    scrollTo,
  );
  appendPageNavigation(shell.article, theme, 'controls');

  return shell.page;
};
