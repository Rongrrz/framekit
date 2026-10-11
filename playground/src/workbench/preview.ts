import {
  bindKeyedChildren,
  color3FromHex,
  createComputedValue,
  createTextButton,
  createUICorner,
  createUIStroke,
  createTween,
  udim2FromOffset,
  type Frame,
  type ObservableValue,
} from 'framekit';

import { fonts, type ThemeValue } from '../theme';
import type { DesignObject, WorkbenchModel } from './model';

/** Persistent preview cards own pointer capture; model coordinates stay independent of zoom. */
export const bindPreview = (
  canvas: Frame,
  model: WorkbenchModel,
  zoom: ObservableValue<number>,
  theme: ThemeValue,
): (() => void) => {
  const views = new Map<string, ReturnType<typeof createTextButton>>();
  const cards = createComputedValue([model.state, zoom], () =>
    model.state.get().objects.filter((object) => object.kind === 'card'),
  );
  bindKeyedChildren(canvas, cards, {
    key: (object) => object.id,
    create: (object) => {
      const card = createTextButton({
        Name: `Preview:${object.id}`,
        TextSize: 24,
        FontFamily: fonts.sans,
        FontWeight: 800,
        TextColor3: color3FromHex('#0a0d12'),
        AutoButtonColor: false,
      });
      card.unsafeElement.setAttribute('aria-label', `Select ${object.name}`);
      card.unsafeElement.style.touchAction = 'none';
      card.unsafeElement.style.cursor = 'grab';
      createUICorner({ CornerRadius: 14 }).Parent = card;
      const outline = createUIStroke({ Thickness: 3, Color: theme.get().text });
      outline.Parent = card;
      views.set(object.id, card);
      card.onDestroy(() => views.delete(object.id));
      let drag:
        | Readonly<{ pointerId: number; x: number; y: number; object: DesignObject }>
        | undefined;
      card.on('pointerdown', (event) => {
        if (event.button !== 0) {
          return;
        }
        event.preventDefault();
        card.focus();
        model.select(object.id);
        const current = model.state.get().objects.find((item) => item.id === object.id)!;
        drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, object: current };
        model.beginEdit();
        card.Rotation = 0;
        card.setPointerCapture(event.pointerId);
      });
      card.on('pointermove', (event) => {
        if (!drag || drag.pointerId !== event.pointerId) {
          return;
        }
        model.patch(object.id, {
          x: Math.round(
            Math.max(
              0,
              Math.min(
                800 - drag.object.width,
                drag.object.x + (event.clientX - drag.x) / zoom.get(),
              ),
            ),
          ),
          y: Math.round(
            Math.max(
              0,
              Math.min(
                600 - drag.object.height,
                drag.object.y + (event.clientY - drag.y) / zoom.get(),
              ),
            ),
          ),
        });
      });
      card.on('pointerup', (event) => {
        if (!drag || drag.pointerId !== event.pointerId) {
          return;
        }
        drag = undefined;
        card.releasePointerCapture(event.pointerId);
        model.endEdit();
      });
      card.on('pointercancel', () => {
        drag = undefined;
        model.cancelEdit();
      });
      card.on('lostpointercapture', () => {
        if (drag) {
          drag = undefined;
          model.endEdit();
        }
      });
      card.onClick(() => model.select(object.id));
      return card;
    },
    update: (card, object, index) => {
      const selected = model.state.get().selectedId === object.id;
      card.setProperties({
        Text: object.name,
        BackgroundColor3: color3FromHex(object.color),
        Position: udim2FromOffset(object.x * zoom.get(), object.y * zoom.get()),
        Size: udim2FromOffset(object.width * zoom.get(), object.height * zoom.get()),
        TextSize: Math.max(12, 24 * zoom.get()),
        ZIndex: index + 1,
      });
      card.unsafeElement.setAttribute('aria-label', `Select ${object.name}`);
      card.unsafeElement.setAttribute('aria-pressed', String(selected));
      const outline = card.getChildren().find((child) => child.isA('UIStroke'));
      if (outline?.isA('UIStroke')) {
        outline.Transparency = selected ? 0 : 1;
      }
    },
  });
  return (): void => {
    const view = views.get(model.state.get().selectedId);
    if (view) {
      createTween(view, { Duration: 0.3, Reverses: true }, { Rotation: 8 }).play();
    }
  };
};
