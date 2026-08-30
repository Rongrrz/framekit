import { fk, fka } from 'framekit';

import { bindButtonMotion } from '../behaviors/hover-motion';
import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { appendSectionHeading, createSection, createSectionContent } from '../section';
import { colors, fonts } from '../theme';
import { addRoundedBorder, appendCodeLine, createButton, createText } from '../ui';

type LifecyclePhase = 'attached' | 'detached' | 'destroyed';

const lifecycleCopy = {
  attached: {
    accent: colors.mint,
    title: 'ATTACHED',
    body: 'ItemDetails is beneath Inventory and all lifecycle-owned resources are active.',
    child: '    ● ItemDetails',
    resources: '      3 resources owned',
    code: 'details.Parent = inventory;',
  },
  detached: {
    accent: colors.amber,
    title: 'DETACHED, STILL REUSABLE',
    body: 'The instance left the visible tree, but it remains valid and can be parented again.',
    child: '    ○ ItemDetails',
    resources: '      resources still owned',
    code: 'details.Parent = undefined;',
  },
  destroyed: {
    accent: colors.coral,
    title: 'DESTROYED AND RELEASED',
    body: 'The instance is permanently invalid. Descendants, listeners, watchers, and animations are released.',
    child: '    × ItemDetails',
    resources: '      0 resources owned',
    code: 'details.destroy();',
  },
} as const;

export function createLifecycle(layout: fk.Value<PlaygroundLayout>): fk.Frame {
  const section = createSection('lifecycle', layout, colors.ink);
  const content = createSectionContent(section, layout);
  appendSectionHeading(
    content,
    layout,
    'REMOVE TO REUSE. DESTROY TO RELEASE.',
    'These controls operate on a real instance. Remove keeps it valid; destroy closes its entire ownership boundary.',
    'light',
  );

  const phase = fk.createValue<LifecyclePhase>('attached');
  const inventory = fk.createFrame({
    Name: 'Inventory',
    Size: fk.udim2FromOffset(0, 0),
    BackgroundTransparency: 1,
  });
  let details = createDetails();
  inventory.addChild(details);
  content.addChild(inventory);

  const actions = [
    {
      label: 'ADD',
      accent: colors.mint,
      run: () => {
        if (details.isDestroyed()) details = createDetails();
        details.Parent = inventory;
        phase.set('attached');
      },
    },
    {
      label: 'REMOVE',
      accent: colors.amber,
      run: () => {
        if (details.isDestroyed()) return;
        details.Parent = undefined;
        phase.set('detached');
      },
    },
    {
      label: 'DESTROY',
      accent: colors.coral,
      run: () => {
        if (!details.isDestroyed()) details.destroy();
        phase.set('destroyed');
      },
    },
  ] as const;

  for (const [index, action] of actions.entries()) {
    const control = createButton(
      action.label,
      fk.udim2FromOffset(106, 44),
      fk.udim2FromOffset(index * 126, 232),
      colors.inkRaised,
      colors.text,
    );
    control.setProperties({ TextSize: 9, FontFamily: fonts.mono });
    bindLayoutProperties(section, layout, control, {
      desktop: {
        Size: fk.udim2FromOffset(160, 48),
        Position: fk.udim2FromOffset(index * 176, 232),
      },
      mobile: {
        Size: fk.udim2FromOffset(106, 44),
        Position: fk.udim2FromOffset(index * 126, 232),
      },
    });
    bindButtonMotion(control, colors.inkRaised, action.accent);
    control.onClick(action.run);
    content.addChild(control);
  }

  const tree = createPanel(colors.inkRaised);
  const result = createPanel(colors.paperRaised);
  const code = createPanel(colors.inkRaised);
  bindLayoutProperties(section, layout, tree, {
    desktop: {
      Size: fk.udim2FromOffset(340, 330),
      Position: fk.udim2FromOffset(0, 324),
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 226),
      Position: fk.udim2FromOffset(0, 314),
    },
  });
  bindLayoutProperties(section, layout, result, {
    desktop: {
      Size: fk.udim2FromOffset(340, 330),
      Position: fk.udim2FromOffset(370, 324),
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 220),
      Position: fk.udim2FromOffset(0, 570),
    },
  });
  bindLayoutProperties(section, layout, code, {
    desktop: {
      Size: fk.udim2FromOffset(340, 330),
      Position: fk.udim2FromOffset(740, 324),
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 210),
      Position: fk.udim2FromOffset(0, 820),
    },
  });

  appendCodeLine(tree, '▼ ScreenGui', 28, colors.violet);
  appendCodeLine(tree, '  ▼ Inventory', 76, colors.mint);
  const child = appendCodeLine(tree, '', 124, colors.coral);
  const resources = appendCodeLine(tree, '', 172, colors.textMuted);
  const resultTitle = createText({
    text: '',
    size: fk.udim2(1, -48, 0, 56),
    position: fk.udim2FromOffset(24, 26),
    color: colors.darkText,
    textSize: 22,
    weight: 900,
    wrapped: true,
    yAlignment: 'Top',
  });
  const resultBody = createText({
    text: '',
    size: fk.udim2(1, -48, 0, 170),
    position: fk.udim2FromOffset(24, 104),
    color: colors.darkMuted,
    textSize: 13,
    wrapped: true,
    yAlignment: 'Top',
  });
  result.addChild(resultTitle);
  result.addChild(resultBody);
  const actionLine = appendCodeLine(code, '', 44, colors.coral);
  appendCodeLine(code, '// no framework unmount phase', 104, colors.mint);
  appendCodeLine(code, '// ownership follows the instance', 164, colors.violet);

  content.addChild(tree);
  content.addChild(result);
  content.addChild(code);
  result.watch(phase, (currentPhase) => {
    const copy = lifecycleCopy[currentPhase];
    resultTitle.Text = copy.title;
    resultBody.Text = copy.body;
    child.setProperties({ Text: copy.child, TextColor3: copy.accent });
    resources.Text = copy.resources;
    actionLine.Text = copy.code;
  });

  section.addChild(content);
  return section;
}

function createDetails(): fk.Frame {
  const details = fk.createFrame({
    Name: 'ItemDetails',
    Size: fk.udim2FromOffset(0, 0),
    BackgroundTransparency: 1,
  });
  const visible = fk.createValue(true);
  details.watch(visible, (isVisible) => {
    details.Visible = isVisible;
  });
  details.onMouseEnter(() => visible.set(!visible.get()));
  fka.spring(details);
  return details;
}

function createPanel(background: fk.Color3): fk.Frame {
  const panel = fk.createFrame({ BackgroundColor3: background });
  addRoundedBorder(panel, 18, colors.inkSoft);
  return panel;
}
