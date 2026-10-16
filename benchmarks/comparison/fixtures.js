import { createFrame, createUIListLayout, udim2FromOffset } from 'framekit';

import { makeFrameKitFixture } from './fixture-framekit.js';
import { makeReactFixture } from './fixture-react.js';
import { getTemplate } from './fixture-styles.js';

/** Runtime-specific ownership stays behind one observable benchmark contract. */
export function makeFixture(runtime, count, kind = 'rotation', targetCount = count) {
  const styles = getTemplate(targetCount, kind === 'text');

  return runtime === 'framekit'
    ? makeFrameKitFixture(count, kind, targetCount)
    : makeReactFixture(runtime, count, kind, styles);
}

export function compatibilityAudit() {
  const first = createFrame();
  const second = createFrame();
  const order = [];
  first.on('mouseenter', () => order.push('raw'));
  first.onMouseEnter(() => order.push('typed'));
  first.unsafeElement.dispatchEvent(new MouseEvent('mouseenter'));

  const result = {
    sharedDefaultSize: first.Size === second.Size,
    sharedDefaultPosition: first.Position === second.Position,
    frozenSize: Object.isFrozen(first.Size) && Object.isFrozen(first.Size.X),
    hoverOrderWhenRawSubscribedFirst: order,
  };

  first.Size = udim2FromOffset(200, 100);
  result.independentSizeAfterAssignment = second.Size.X.Offset === 100;

  const parent = createFrame();
  first.LayoutOrder = 2;
  second.LayoutOrder = 1;
  first.Parent = parent;
  second.Parent = parent;
  createUIListLayout().Parent = parent;
  result.layoutCssOrders = [first.unsafeElement.style.order, second.unsafeElement.style.order];
  result.sortedDomOrder = parent.unsafeElement.firstElementChild === second.unsafeElement;
  parent.destroy();

  return result;
}
