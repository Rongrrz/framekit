import { createFrame, createTextButton, bindPopover, udim2FromOffset } from 'framekit';

const trigger = createTextButton({ Text: 'Actions' });

const panel = createFrame({ Size: udim2FromOffset(240, 60) });

createTextButton({ Text: 'Save', Size: udim2FromOffset(240, 44) }).Parent = panel;

bindPopover(trigger, panel, { placement: 'bottom', gap: 8 });

trigger.onDestroy(() => panel.destroy());
