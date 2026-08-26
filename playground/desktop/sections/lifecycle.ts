import { fk } from 'framekit';

import { bindScaleMotion } from '../../shared/interaction';
import { button, codeLine, decorate, text } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { contentWidth, pageSection, scaledPosition, scaledSize, sectionContent } from '../geometry';
import { sectionLayout } from '../layout';

type LifecyclePhase = 'attached' | 'detached' | 'destroyed';

const { top, height } = sectionLayout.lifecycle;

export function createLifecycle(): fk.FrameNode {
  const section = pageSection('Lifecycle', top, height, colors.ink);
  const content = sectionContent();

  fk.append(
    content,
    text({
      text: 'OWNERSHIP WITHOUT\nLIFECYCLE MYSTERY.',
      size: scaledSize(650, 128, contentWidth, height),
      position: scaledPosition(0, 62, contentWidth, height),
      textSize: 40,
      weight: 900,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  fk.append(
    content,
    text({
      text: 'Detach when a node should remain reusable. Destroy when its descendants, listeners, observations, and animations should be released.',
      size: scaledSize(410, 104, contentWidth, height),
      position: scaledPosition(710, 76, contentWidth, height),
      color: colors.textMuted,
      textSize: 16,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  const lab = fk.createFrame({
    Name: 'LifecycleExplorer',
    Size: scaledSize(contentWidth, 548, contentWidth, height),
    Position: scaledPosition(0, 220, contentWidth, height),
    BackgroundColor3: colors.inkRaised,
    ClipsDescendants: true,
  });
  decorate(lab, 24, colors.inkSoft, 2);

  const controls = fk.createFrame({
    Name: 'LifecycleControls',
    Size: fk.udim2FromOffset(352, 548),
    BackgroundColor3: colors.inkRaised,
  });
  fk.append(
    controls,
    text({
      text: 'NODE LIFECYCLE',
      size: fk.udim2FromOffset(296, 30),
      position: fk.udim2FromOffset(28, 26),
      color: colors.textMuted,
      textSize: 10,
      font: fonts.mono,
      weight: 750,
    }),
  );
  const tree = fk.createFrame({
    Size: fk.udim2FromOffset(296, 170),
    Position: fk.udim2FromOffset(28, 72),
    BackgroundColor3: colors.ink,
  });
  decorate(tree, 14, colors.inkSoft);
  codeLine(tree, '▼ ScreenGui', 16, colors.violet);
  codeLine(tree, '  ▼ InventoryPanel', 48, colors.mint);
  const childLine = codeLine(tree, '    ● ItemDetails', 80, colors.coral);
  const resourceLine = codeLine(tree, '      3 resources owned', 116, colors.textMuted);
  fk.append(controls, tree);

  const actions: readonly [LifecyclePhase, string, fk.Color3][] = [
    ['attached', 'APPEND', colors.mint],
    ['detached', 'DETACH', colors.amber],
    ['destroyed', 'DESTROY', colors.coral],
  ];
  const actionButtons = new Map<LifecyclePhase, fk.TextButtonNode>();
  for (const [index, [phase, label]] of actions.entries()) {
    const action = button(
      label,
      fk.udim2FromOffset(88, 44),
      fk.udim2FromOffset(28 + index * 104, 270),
      colors.ink,
      colors.text,
    );
    fk.update(action, { TextSize: 10, FontFamily: fonts.mono });
    bindScaleMotion(action, 1.04);
    actionButtons.set(phase, action);
    fk.append(controls, action);
  }
  const explanation = text({
    text: '',
    size: fk.udim2FromOffset(296, 96),
    position: fk.udim2FromOffset(28, 344),
    color: colors.textMuted,
    textSize: 13,
    wrapped: true,
    yAlignment: 'Top',
  });
  fk.append(controls, explanation);
  const status = text({
    text: '',
    size: fk.udim2FromOffset(296, 40),
    position: fk.udim2FromOffset(28, 474),
    color: colors.mint,
    textSize: 10,
    font: fonts.mono,
  });
  fk.append(controls, status);
  fk.append(lab, controls);

  const stage = fk.createFrame({
    Name: 'LifecycleStage',
    Size: fk.udim2(1, -352, 1, 0),
    Position: fk.udim2FromOffset(352, 0),
    BackgroundColor3: colors.paperRaised,
  });
  const inventory = fk.createFrame({
    Name: 'InventoryPanel',
    Size: fk.udim2FromOffset(410, 260),
    Position: fk.udim2FromOffset(54, 54),
    BackgroundColor3: colors.paper,
  });
  decorate(inventory, 20, colors.paperMuted, 2);
  fk.append(
    inventory,
    text({
      text: 'INVENTORY PANEL',
      size: fk.udim2FromOffset(340, 30),
      position: fk.udim2FromOffset(24, 20),
      color: colors.darkMuted,
      textSize: 10,
      font: fonts.mono,
      weight: 750,
    }),
  );
  fk.append(stage, inventory);

  const pool = fk.createFrame({
    Name: 'DetachedPool',
    Size: fk.udim2FromOffset(270, 260),
    Position: fk.udim2FromOffset(500, 54),
    BackgroundColor3: colors.paper,
  });
  decorate(pool, 20, colors.paperMuted, 2);
  fk.append(
    pool,
    text({
      text: 'DETACHED HANDLE',
      size: fk.udim2FromOffset(220, 30),
      position: fk.udim2FromOffset(24, 20),
      color: colors.darkMuted,
      textSize: 10,
      font: fonts.mono,
      weight: 750,
    }),
  );
  const ghost = fk.createTextLabel({
    Size: fk.udim2FromOffset(220, 112),
    Position: fk.udim2FromOffset(24, 82),
    BackgroundColor3: colors.paperMuted,
    BackgroundTransparency: 0.4,
    Text: 'NO DETACHED NODE',
    TextColor3: colors.darkMuted,
    TextSize: 12,
    FontFamily: fonts.mono,
    FontWeight: 700,
  });
  fk.append(ghost, fk.createUICorner({ CornerRadius: 16 }));
  fk.append(pool, ghost);
  fk.append(stage, pool);

  const code = fk.createFrame({
    Name: 'LifecycleCode',
    Size: fk.udim2FromOffset(716, 154),
    Position: fk.udim2FromOffset(54, 350),
    BackgroundColor3: colors.ink,
  });
  decorate(code, 16, colors.inkSoft);
  const codeTitle = codeLine(code, '// ItemDetails is currently attached', 16, colors.textMuted);
  const codeAction = codeLine(code, 'fk.append(inventory, details);', 52, colors.mint);
  const codeResult = codeLine(code, '// parent(details) === inventory', 88, colors.violet);
  fk.append(stage, code);
  fk.append(lab, stage);

  let details = createDetailsNode();
  fk.append(inventory, details);

  function setPhase(phase: LifecyclePhase): void {
    if (phase === 'attached') {
      if (fk.isDestroyed(details)) details = createDetailsNode();
      if (fk.parent(details) === undefined) fk.append(inventory, details);
      fk.update(ghost, { Text: 'NO DETACHED NODE', BackgroundColor3: colors.paperMuted });
      fk.update(childLine, { Text: '    ● ItemDetails', TextColor3: colors.coral });
      fk.update(resourceLine, { Text: '      3 resources owned' });
      fk.update(explanation, {
        Text: 'append() gives the node a visible parent. Its events, observations, and motion remain owned by the node.',
      });
      fk.update(status, { Text: '● ATTACHED AND ACTIVE', TextColor3: colors.mint });
      fk.update(codeTitle, { Text: '// ItemDetails is currently attached' });
      fk.update(codeAction, { Text: 'fk.append(inventory, details);' });
      fk.update(codeResult, { Text: '// parent(details) === inventory' });
    } else if (phase === 'detached') {
      if (!fk.isDestroyed(details) && fk.parent(details) !== undefined) fk.detach(details);
      fk.update(ghost, { Text: 'ItemDetails\nREUSABLE', BackgroundColor3: colors.amber });
      fk.update(childLine, { Text: '    ○ ItemDetails (detached)', TextColor3: colors.amber });
      fk.update(resourceLine, { Text: '      resources still owned' });
      fk.update(explanation, {
        Text: 'detach() removes the node from the visible tree without invalidating its handle. It can be appended again.',
      });
      fk.update(status, { Text: '○ DETACHED, STILL REUSABLE', TextColor3: colors.amber });
      fk.update(codeTitle, { Text: '// Keep the node for later reuse' });
      fk.update(codeAction, { Text: 'fk.detach(details);' });
      fk.update(codeResult, { Text: '// isDestroyed(details) === false' });
    } else {
      if (!fk.isDestroyed(details)) fk.destroy(details);
      fk.update(ghost, { Text: 'HANDLE RELEASED', BackgroundColor3: colors.coral });
      fk.update(childLine, { Text: '    × ItemDetails (destroyed)', TextColor3: colors.coral });
      fk.update(resourceLine, { Text: '      0 resources owned' });
      fk.update(explanation, {
        Text: 'destroy() permanently invalidates the handle and releases descendants plus every lifecycle-owned resource.',
      });
      fk.update(status, { Text: '× DESTROYED AND RELEASED', TextColor3: colors.coral });
      fk.update(codeTitle, { Text: '// Release the complete owned subtree' });
      fk.update(codeAction, { Text: 'fk.destroy(details);' });
      fk.update(codeResult, { Text: '// isDestroyed(details) === true' });
    }
    for (const [key, action] of actionButtons) {
      const accent = actions.find(([candidate]) => candidate === key)![2];
      fk.update(action, {
        BackgroundColor3: key === phase ? accent : colors.ink,
        TextColor3: key === phase ? colors.ink : colors.text,
      });
    }
  }

  for (const [phase, action] of actionButtons) {
    fk.on(action, 'MouseButton1Click', () => setPhase(phase));
  }
  setPhase('attached');

  fk.append(content, lab);
  fk.append(section, content);
  return section;
}

function createDetailsNode(): fk.FrameNode {
  const node = fk.createFrame({
    Name: 'ItemDetails',
    Size: fk.udim2FromOffset(354, 152),
    Position: fk.udim2FromOffset(28, 76),
    BackgroundColor3: colors.violet,
  });
  decorate(node, 18, colors.ink, 2);
  fk.append(
    node,
    text({
      text: 'ITEM DETAILS',
      size: fk.udim2FromOffset(300, 46),
      position: fk.udim2FromOffset(24, 18),
      color: colors.ink,
      textSize: 22,
      weight: 900,
    }),
  );
  fk.append(
    node,
    text({
      text: '1 event  •  1 observation  •  1 motion',
      size: fk.udim2FromOffset(300, 34),
      position: fk.udim2FromOffset(24, 86),
      color: colors.inkSoft,
      textSize: 11,
      font: fonts.mono,
    }),
  );
  return node;
}
