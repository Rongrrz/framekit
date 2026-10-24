import {
  color3FromHex,
  createFrame,
  createUIStroke,
  udim2,
  udim2FromOffset,
  type Frame,
} from 'framekit';

/** Editor decoration lives above the scene's stacking context, without changing authored z-order. */
export const bindSelectionOverlay = (world: Frame, canvas: Frame): void => {
  const layer = createFrame({
    Name: 'Selection overlay',
    Size: udim2(1, 0, 1, 0),
    BackgroundTransparency: 1,
    ZIndex: 2,
  });
  layer.Parent = world;
  layer.unsafeElement.dataset.selectionOverlay = '';
  layer.unsafeElement.setAttribute('aria-hidden', 'true');
  const outline = createFrame({
    Name: 'Selection bounds',
    BackgroundTransparency: 1,
    Visible: false,
  });
  outline.Parent = layer;
  outline.unsafeElement.dataset.selectionBounds = '';
  createUIStroke({
    Color: color3FromHex('#3d9dff'),
    Thickness: 2,
    BorderStrokePosition: 'Inner',
  }).Parent = outline;
  let pending: number | undefined;
  let selected: HTMLElement | null = null;

  const paint = (): void => {
    pending = undefined;
    const target = canvas.unsafeElement.querySelector<HTMLElement>('[data-workbench-selected]');

    if (target !== selected) {
      if (selected) {
        sizes.unobserve(selected);
      }

      selected = target;

      if (target) {
        sizes.observe(target);
      }
    }

    if (!target?.getClientRects().length) {
      outline.Visible = false;
      return;
    }

    const bounds = target.getBoundingClientRect();
    const origin = world.unsafeElement.getBoundingClientRect();
    const style = getComputedStyle(target);
    let rotation = 0;
    let scale = 1;
    let ancestor: HTMLElement | null = target;

    // Workbench scenes use 2D Rotation and uniform UIScale. DOM bounds supply the translated center,
    // including native scrolling; computed dimensions retain the unrotated rectangle.
    while (ancestor && ancestor !== world.unsafeElement) {
      const current = getComputedStyle(ancestor);
      rotation += Number.parseFloat(current.rotate) || 0;
      scale *= Number.parseFloat(current.scale) || 1;
      ancestor = ancestor.parentElement;
    }

    const width = Number.parseFloat(style.width) * scale;
    const height = Number.parseFloat(style.height) * scale;

    outline.setProperties({
      Visible: bounds.width > 0 && bounds.height > 0,
      Position: udim2FromOffset(
        bounds.left + bounds.width / 2 - origin.left - width / 2,
        bounds.top + bounds.height / 2 - origin.top - height / 2,
      ),
      Size: udim2FromOffset(width, height),
      Rotation: rotation,
    });
  };
  const schedule = (): void => {
    if (pending === undefined) {
      pending = requestAnimationFrame(paint);
    }
  };
  const sizes = new ResizeObserver(schedule);
  sizes.observe(world.unsafeElement);
  const changes = new MutationObserver(schedule);
  changes.observe(canvas.unsafeElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['style', 'data-workbench-selected'],
  });
  const stopScroll = world.on('scroll', schedule, { capture: true });
  layer.onDestroy(() => {
    stopScroll();
    sizes.disconnect();
    changes.disconnect();
    selected = null;

    if (pending !== undefined) {
      cancelAnimationFrame(pending);
    }
  });
  schedule();
};
