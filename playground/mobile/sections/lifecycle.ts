import { fk } from 'framekit';

import { bindButtonMotion } from '../../shared/interaction';
import { button, codeLine, decorate, text } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { sectionLayout } from '../layout';
import {
  contentWidth,
  createSection,
  createSectionContent,
  appendSectionHeading,
} from '../primitives';

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
  for (const [index, label] of ['APPEND', 'DETACH', 'DESTROY'].entries()) {
    const control = button(
      label,
      fk.udim2FromOffset(106, 44),
      fk.udim2FromOffset(index * 126, 226),
      colors.inkRaised,
      colors.text,
    );
    fk.update(control, { TextSize: 9, FontFamily: fonts.mono });
    bindButtonMotion(control, colors.inkRaised, [colors.mint, colors.amber, colors.coral][index]!);
    fk.on(control, 'MouseButton1Click', () => phase(index));
    fk.append(content, control);
  }
  const tree = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 246),
    Position: fk.udim2FromOffset(0, 304),
    BackgroundColor3: colors.inkRaised,
  });
  decorate(tree, 18, colors.inkSoft);
  codeLine(tree, '▼ ScreenGui', 24, colors.violet);
  codeLine(tree, '  ▼ Inventory', 64, colors.mint);
  const child = codeLine(tree, '    ● ItemDetails', 104, colors.coral);
  const resources = codeLine(tree, '      3 resources owned', 146, colors.textMuted);
  fk.append(content, tree);
  const result = fk.createFrame({
    Size: fk.udim2FromOffset(contentWidth, 220),
    Position: fk.udim2FromOffset(0, 582),
    BackgroundColor3: colors.paperRaised,
  });
  decorate(result, 18, colors.paperMuted);
  const resultTitle = text({
    text: '',
    size: fk.udim2FromOffset(310, 42),
    position: fk.udim2FromOffset(24, 24),
    color: colors.darkText,
    textSize: 22,
    weight: 900,
  });
  const resultBody = text({
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
  decorate(code, 16, colors.inkSoft);
  const action = codeLine(code, '', 30, colors.coral);
  const outcome = codeLine(code, '', 82, colors.mint);
  const ownership = codeLine(code, '', 134, colors.violet);
  fk.append(content, code);
  fk.state.observe(result, phase, (value) => {
    const data = [
      [
        'ATTACHED',
        'The node is visible beneath Inventory and all three lifecycle-owned resources are active.',
        '    ● ItemDetails',
        '      3 resources owned',
        'fk.append(inventory, details);',
        '// visible and interactive',
        '// parent(details) === inventory',
      ],
      [
        'DETACHED, STILL REUSABLE',
        'The node leaves the visible tree, but its handle remains valid and can be appended again.',
        '    ○ ItemDetails',
        '      resources still owned',
        'fk.detach(details);',
        '// reusable handle retained',
        '// isDestroyed(details) === false',
      ],
      [
        'DESTROYED AND RELEASED',
        'The handle is permanently invalidated. Descendants, listeners, observations, and animations are released.',
        '    × ItemDetails',
        '      0 resources owned',
        'fk.destroy(details);',
        '// complete owned subtree released',
        '// isDestroyed(details) === true',
      ],
    ] as const;
    const item = data[value]!;
    fk.update(resultTitle, { Text: item[0] });
    fk.update(resultBody, { Text: item[1] });
    fk.update(child, {
      Text: item[2],
      TextColor3: [colors.coral, colors.amber, colors.coral][value]!,
    });
    fk.update(resources, { Text: item[3] });
    fk.update(action, { Text: item[4] });
    fk.update(outcome, { Text: item[5] });
    fk.update(ownership, { Text: item[6] });
  });
  fk.append(section, content);
  return section;
}
