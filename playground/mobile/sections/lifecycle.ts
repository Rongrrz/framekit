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
    buttonLabel: 'APPEND',
    accent: colors.mint,
    title: 'ATTACHED',
    body: 'The node is visible beneath Inventory and all three lifecycle-owned resources are active.',
    child: '    ● ItemDetails',
    resources: '      3 resources owned',
    action: 'fk.append(inventory, details);',
    outcome: '// visible and interactive',
    ownership: '// parent(details) === inventory',
  },
  {
    buttonLabel: 'DETACH',
    accent: colors.amber,
    title: 'DETACHED, STILL REUSABLE',
    body: 'The node leaves the visible tree, but its handle remains valid and can be appended again.',
    child: '    ○ ItemDetails',
    resources: '      resources still owned',
    action: 'fk.detach(details);',
    outcome: '// reusable handle retained',
    ownership: '// isDestroyed(details) === false',
  },
  {
    buttonLabel: 'DESTROY',
    accent: colors.coral,
    title: 'DESTROYED AND RELEASED',
    body: 'The handle is permanently invalidated. Descendants, listeners, observations, and animations are released.',
    child: '    × ItemDetails',
    resources: '      0 resources owned',
    action: 'fk.destroy(details);',
    outcome: '// complete owned subtree released',
    ownership: '// isDestroyed(details) === true',
  },
] as const;

export function createLifecycle(): fk.FrameNode {
  const section = createSection('MobileLifecycle', sectionLayout.lifecycle, colors.ink);
  const content = createSectionContent();
  appendSectionHeading(
    content,
    'DETACH TO REUSE.\nDESTROY TO RELEASE.',
    'Lifecycle is explicit, testable, and owned by the node—not scattered across cleanup callbacks.',
    false,
  );
  const phase = fk.state.observable(0);
  for (const [index, state] of lifecycleStates.entries()) {
    const control = createButton(
      state.buttonLabel,
      fk.udim2FromOffset(106, 44),
      fk.udim2FromOffset(index * 126, 226),
      colors.inkRaised,
      colors.text,
    );
    fk.update(control, { TextSize: 9, FontFamily: fonts.mono });
    bindButtonMotion(control, colors.inkRaised, state.accent);
    control.onClick(() => phase.set(index));
    fk.append(content, control);
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
  fk.append(content, tree);
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
  fk.append(result, resultTitle);
  fk.append(result, resultBody);
  fk.append(content, result);
  const code = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 214),
    Position: fk.udim2FromOffset(0, 834),
    BackgroundColor3: colors.inkRaised,
  });
  addRoundedBorder(code, 16, colors.inkSoft);
  const action = appendCodeLine(code, '', 30, colors.coral);
  const outcome = appendCodeLine(code, '', 82, colors.mint);
  const ownership = appendCodeLine(code, '', 134, colors.violet);
  fk.append(content, code);
  fk.state.observe(result, phase, (value) => {
    const state = lifecycleStates[value];
    if (!state) return;
    fk.update(resultTitle, { Text: state.title });
    fk.update(resultBody, { Text: state.body });
    fk.update(child, { Text: state.child, TextColor3: state.accent });
    fk.update(resources, { Text: state.resources });
    fk.update(action, { Text: state.action });
    fk.update(outcome, { Text: state.outcome });
    fk.update(ownership, { Text: state.ownership });
  });
  fk.append(section, content);
  return section;
}
