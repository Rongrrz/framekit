import { fk } from 'framekit';

import { bindScaleMotion } from '../../shared/interaction';
import { createButton, appendCodeLine, addRoundedBorder, createText } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { contentWidth, pageSection, scaledPosition, scaledSize, sectionContent } from '../geometry';
import { sectionLayout } from '../layout';

type LifecyclePhase = 'attached' | 'detached' | 'destroyed';

const { top, height } = sectionLayout.lifecycle;

export function createLifecycle(): fk.FrameNode {
  const section = pageSection('Lifecycle', top, height, colors.ink);

  const content = sectionContent();

  content.addChild(
    createText({
      text: 'OWNERSHIP WITHOUT\nLIFECYCLE MYSTERY.',
      size: scaledSize(650, 128, contentWidth, height),
      position: scaledPosition(0, 62, contentWidth, height),
      textSize: 40,
      weight: 900,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  content.addChild(
    createText({
      text: 'Remove a node from its parent when it should remain reusable. Destroy it when descendants, listeners, watched values, and animations should be released.',
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
  addRoundedBorder(lab, 24, colors.inkSoft, 2);

  const controls = fk.createFrame({
    Name: 'LifecycleControls',
    Size: fk.udim2FromOffset(352, 548),
    BackgroundColor3: colors.inkRaised,
  });

  controls.addChild(
    createText({
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
  addRoundedBorder(tree, 14, colors.inkSoft);
  appendCodeLine(tree, '▼ ScreenGui', 16, colors.violet);
  appendCodeLine(tree, '  ▼ InventoryPanel', 48, colors.mint);

  const childLine = appendCodeLine(tree, '    ● ItemDetails', 80, colors.coral);

  const resourceLine = appendCodeLine(tree, '      3 resources owned', 116, colors.textMuted);

  controls.addChild(tree);

  const actions: readonly Readonly<{
    phase: LifecyclePhase;
    label: string;
    accent: fk.Color3;
  }>[] = [
    { phase: 'attached', label: 'ADD CHILD', accent: colors.mint },
    { phase: 'detached', label: 'REMOVE', accent: colors.amber },
    { phase: 'destroyed', label: 'DESTROY', accent: colors.coral },
  ];

  const actionButtons = new Map<
    LifecyclePhase,
    Readonly<{
      button: fk.TextButtonNode;
      accent: fk.Color3;
    }>
  >();
  for (const [index, { phase, label, accent }] of actions.entries()) {
    const action = createButton(
      label,
      fk.udim2FromOffset(88, 44),
      fk.udim2FromOffset(28 + index * 104, 270),
      colors.ink,
      colors.text,
    );
    action.setProperties({ TextSize: 10, FontFamily: fonts.mono });
    bindScaleMotion(action, 1.04);
    actionButtons.set(phase, { button: action, accent });
    controls.addChild(action);
  }

  const explanation = createText({
    text: '',
    size: fk.udim2FromOffset(296, 96),
    position: fk.udim2FromOffset(28, 344),
    color: colors.textMuted,
    textSize: 13,
    wrapped: true,
    yAlignment: 'Top',
  });

  controls.addChild(explanation);

  const status = createText({
    text: '',
    size: fk.udim2FromOffset(296, 40),
    position: fk.udim2FromOffset(28, 474),
    color: colors.mint,
    textSize: 10,
    font: fonts.mono,
  });

  controls.addChild(status);

  lab.addChild(controls);

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
  addRoundedBorder(inventory, 20, colors.paperMuted, 2);

  inventory.addChild(
    createText({
      text: 'INVENTORY PANEL',
      size: fk.udim2FromOffset(340, 30),
      position: fk.udim2FromOffset(24, 20),
      color: colors.darkMuted,
      textSize: 10,
      font: fonts.mono,
      weight: 750,
    }),
  );

  stage.addChild(inventory);

  const pool = fk.createFrame({
    Name: 'DetachedPool',
    Size: fk.udim2FromOffset(270, 260),
    Position: fk.udim2FromOffset(500, 54),
    BackgroundColor3: colors.paper,
  });
  addRoundedBorder(pool, 20, colors.paperMuted, 2);

  pool.addChild(
    createText({
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

  ghost.addChild(fk.createUICorner({ CornerRadius: 16 }));

  pool.addChild(ghost);

  stage.addChild(pool);

  const code = fk.createFrame({
    Name: 'LifecycleCode',
    Size: fk.udim2FromOffset(716, 154),
    Position: fk.udim2FromOffset(54, 350),
    BackgroundColor3: colors.ink,
  });
  addRoundedBorder(code, 16, colors.inkSoft);

  const codeTitle = appendCodeLine(
    code,
    '// ItemDetails is currently attached',
    16,
    colors.textMuted,
  );

  const codeAction = appendCodeLine(code, 'inventory.addChild(details);', 52, colors.mint);

  const codeResult = appendCodeLine(code, '// details.Parent === inventory', 88, colors.violet);

  stage.addChild(code);

  lab.addChild(stage);
  let details = createDetailsNode();

  inventory.addChild(details);
  function setPhase(phase: LifecyclePhase): void {
    if (phase === 'attached') {
      if (details.isDestroyed()) details = createDetailsNode();
      if (details.Parent === undefined) inventory.addChild(details);
      ghost.setProperties({ Text: 'NO DETACHED NODE', BackgroundColor3: colors.paperMuted });
      childLine.setProperties({ Text: '    ● ItemDetails', TextColor3: colors.coral });
      resourceLine.setProperties({ Text: '      3 resources owned' });
      explanation.setProperties({
        Text: 'addChild() gives the node a visible parent. Its events, value watchers, and motion remain owned by the node.',
      });
      status.setProperties({ Text: '● ATTACHED AND ACTIVE', TextColor3: colors.mint });
      codeTitle.setProperties({ Text: '// ItemDetails is currently attached' });
      codeAction.setProperties({ Text: 'inventory.addChild(details);' });
      codeResult.setProperties({ Text: '// details.Parent === inventory' });
    } else if (phase === 'detached') {
      if (!details.isDestroyed() && details.Parent !== undefined) details.removeFromParent();
      ghost.setProperties({ Text: 'ItemDetails\nREUSABLE', BackgroundColor3: colors.amber });
      childLine.setProperties({ Text: '    ○ ItemDetails (detached)', TextColor3: colors.amber });
      resourceLine.setProperties({ Text: '      resources still owned' });
      explanation.setProperties({
        Text: 'removeFromParent() hides the node without invalidating its handle. It can be added again.',
      });
      status.setProperties({ Text: '○ DETACHED, STILL REUSABLE', TextColor3: colors.amber });
      codeTitle.setProperties({ Text: '// Keep the node for later reuse' });
      codeAction.setProperties({ Text: 'details.removeFromParent();' });
      codeResult.setProperties({ Text: '// details.isDestroyed() === false' });
    } else {
      if (!details.isDestroyed()) details.destroy();
      ghost.setProperties({ Text: 'HANDLE RELEASED', BackgroundColor3: colors.coral });
      childLine.setProperties({ Text: '    × ItemDetails (destroyed)', TextColor3: colors.coral });
      resourceLine.setProperties({ Text: '      0 resources owned' });
      explanation.setProperties({
        Text: 'destroy() permanently invalidates the handle and releases descendants plus every lifecycle-owned resource.',
      });
      status.setProperties({ Text: '× DESTROYED AND RELEASED', TextColor3: colors.coral });
      codeTitle.setProperties({ Text: '// Release the complete owned subtree' });
      codeAction.setProperties({ Text: 'details.destroy();' });
      codeResult.setProperties({ Text: '// details.isDestroyed() === true' });
    }
    for (const [key, action] of actionButtons) {
      action.button.setProperties({
        BackgroundColor3: key === phase ? action.accent : colors.ink,
        TextColor3: key === phase ? colors.ink : colors.text,
      });
    }
  }
  for (const [phase, action] of actionButtons) {
    action.button.onClick(() => setPhase(phase));
  }
  setPhase('attached');

  content.addChild(lab);

  section.addChild(content);
  return section;
}

function createDetailsNode(): fk.FrameNode {
  const node = fk.createFrame({
    Name: 'ItemDetails',
    Size: fk.udim2FromOffset(354, 152),
    Position: fk.udim2FromOffset(28, 76),
    BackgroundColor3: colors.violet,
  });
  addRoundedBorder(node, 18, colors.ink, 2);

  node.addChild(
    createText({
      text: 'ITEM DETAILS',
      size: fk.udim2FromOffset(300, 46),
      position: fk.udim2FromOffset(24, 18),
      color: colors.ink,
      textSize: 22,
      weight: 900,
    }),
  );

  node.addChild(
    createText({
      text: '1 event  •  1 value watcher  •  1 motion',
      size: fk.udim2FromOffset(300, 34),
      position: fk.udim2FromOffset(24, 86),
      color: colors.inkSoft,
      textSize: 11,
      font: fonts.mono,
    }),
  );
  return node;
}
