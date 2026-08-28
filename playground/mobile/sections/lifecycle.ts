import { fk } from 'framekit';

import { bindButtonMotion } from '../../shared/interaction';
import { createButton, appendCodeLine, addRoundedBorder, createText } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { sectionLayout } from '../layout';
import {
  contentWidth,
  createSection,
  createSectionContent,
  appendSectionHeading,
} from '../primitives';

const lifecycleStates = [
  {
    buttonLabel: 'ADD',
    accent: colors.mint,
    title: 'ATTACHED',
    body: 'The node is visible beneath Inventory and all three lifecycle-owned resources are active.',
    child: '    ● ItemDetails',
    resources: '      3 resources owned',
    action: 'inventory.addChild(details);',
    outcome: '// visible and interactive',
    ownership: '// details.Parent === inventory',
  },
  {
    buttonLabel: 'REMOVE',
    accent: colors.amber,
    title: 'DETACHED, STILL REUSABLE',
    body: 'The node leaves the visible tree, but remains valid and can be added again.',
    child: '    ○ ItemDetails',
    resources: '      resources still owned',
    action: 'details.removeFromParent();',
    outcome: '// reusable node retained',
    ownership: '// details.isDestroyed() === false',
  },
  {
    buttonLabel: 'DESTROY',
    accent: colors.coral,
    title: 'DESTROYED AND RELEASED',
    body: 'The object is permanently invalidated. Descendants, listeners, watched values, and animations are released.',
    child: '    × ItemDetails',
    resources: '      0 resources owned',
    action: 'details.destroy();',
    outcome: '// complete owned subtree released',
    ownership: '// details.isDestroyed() === true',
  },
] as const;

export function createLifecycle(): fk.FrameNode {
  const section = createSection('MobileLifecycle', sectionLayout.lifecycle, colors.ink);

  const content = createSectionContent();
  appendSectionHeading(
    content,
    'REMOVE TO REUSE.\nDESTROY TO RELEASE.',
    'Lifecycle is explicit, testable, and owned by the node—not scattered across cleanup callbacks.',
    false,
  );

  const phase = fk.createValue(0);
  for (const [index, state] of lifecycleStates.entries()) {
    const control = createButton(
      state.buttonLabel,
      fk.udim2FromOffset(106, 44),
      fk.udim2FromOffset(index * 126, 226),
      colors.inkRaised,
      colors.text,
    );
    control.setProperties({ TextSize: 9, FontFamily: fonts.mono });
    bindButtonMotion(control, colors.inkRaised, state.accent);
    control.onClick(() => phase.set(index));
    content.addChild(control);
  }

  const tree = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 246),
    Position: fk.udim2FromOffset(0, 304),
    BackgroundColor3: colors.inkRaised,
  });
  addRoundedBorder(tree, 18, colors.inkSoft);
  appendCodeLine(tree, '▼ ScreenGui', 24, colors.violet);
  appendCodeLine(tree, '  ▼ Inventory', 64, colors.mint);

  const child = appendCodeLine(tree, '    ● ItemDetails', 104, colors.coral);

  const resources = appendCodeLine(tree, '      3 resources owned', 146, colors.textMuted);

  content.addChild(tree);

  const result = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 220),
    Position: fk.udim2FromOffset(0, 582),
    BackgroundColor3: colors.paperRaised,
  });
  addRoundedBorder(result, 18, colors.paperMuted);

  const resultTitle = createText({
    text: '',
    size: fk.udim2FromOffset(310, 42),
    position: fk.udim2FromOffset(24, 24),
    color: colors.darkText,
    textSize: 22,
    weight: 900,
  });

  const resultBody = createText({
    text: '',
    size: fk.udim2FromOffset(310, 108),
    position: fk.udim2FromOffset(24, 78),
    color: colors.darkMuted,
    textSize: 13,
    wrapped: true,
    yAlignment: 'Top',
  });

  result.addChild(resultTitle);

  result.addChild(resultBody);

  content.addChild(result);

  const code = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 214),
    Position: fk.udim2FromOffset(0, 834),
    BackgroundColor3: colors.inkRaised,
  });
  addRoundedBorder(code, 16, colors.inkSoft);

  const action = appendCodeLine(code, '', 30, colors.coral);

  const outcome = appendCodeLine(code, '', 82, colors.mint);

  const ownership = appendCodeLine(code, '', 134, colors.violet);

  content.addChild(code);
  result.watch(phase, (value) => {
    const state = lifecycleStates[value];
    if (!state) return;
    resultTitle.setProperties({ Text: state.title });
    resultBody.setProperties({ Text: state.body });
    child.setProperties({ Text: state.child, TextColor3: state.accent });
    resources.setProperties({ Text: state.resources });
    action.setProperties({ Text: state.action });
    outcome.setProperties({ Text: state.outcome });
    ownership.setProperties({ Text: state.ownership });
  });

  section.addChild(content);
  return section;
}
