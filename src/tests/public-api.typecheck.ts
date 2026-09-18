import { fk, fka, fkh } from '../index.js';

/** Never executed: TypeScript must reject every marked call during the normal typecheck. */
function verifyPublicTypeContracts(): void {
  const frame = fk.createFrame();
  const button = fk.createTextButton();
  const scale = fk.createUIScale();
  scale.Parent = button;
  const dispose: fk.Unsubscribe = fkh.bindHoverScale(button, scale);
  void dispose;
  const disposeToolTip: fk.Unsubscribe = fkh.withToolTip(button, 'Save', {
    followCursor: true,
    style: { TextColor3: fk.color3FromRGB(255, 255, 255) },
  });
  void disposeToolTip;
  fkh.withToolTip(frame, fk.createTextLabel(), { placement: 'right' });
  // @ts-expect-error Tooltips need a DOM-backed target.
  fkh.withToolTip(scale, 'Scale');
  // @ts-expect-error Tooltip content is text or a rectangular GUI instance.
  fkh.withToolTip(button, fk.createScreenGui());
  // @ts-expect-error Placement accepts only supported sides.
  fkh.withToolTip(button, 'Save', { placement: 'cursor' });
  // @ts-expect-error Generated tooltip styles do not own positioning.
  fkh.withToolTip(button, 'Save', { style: { Position: fk.udim2FromOffset(0, 0) } });

  // @ts-expect-error Unknown constructor properties are not accepted.
  fk.createFrame({ Typo: true });
  // @ts-expect-error Invalid enum members are not accepted.
  frame.AutomaticSize = 'EveryAxis';
  // @ts-expect-error GUI parentage is not raw DOM parentage.
  frame.Parent = document.body;
  // @ts-expect-error Browser geometry is readonly.
  frame.AbsoluteSize = fk.vector2(100, 100);
  // @ts-expect-error Structured property values are readonly snapshots.
  frame.Position.X.Offset = 40;
  // @ts-expect-error The escape hatch reference is readonly.
  frame.unsafeElement = document.createElement('div');
  // @ts-expect-error Concrete class identity is readonly.
  frame.ClassName = 'TextButton';
  // @ts-expect-error Frames do not promise native button events.
  frame.onClick(() => undefined);
  // @ts-expect-error Property observers only accept known properties.
  frame.onPropertyChanged('Text', () => undefined);
  // @ts-expect-error Child snapshots cannot mutate the hierarchy.
  frame.getChildren().push(button);
  // @ts-expect-error Exact built-in class guards reject misspelled classes.
  frame.isA('TextButon');

  const child = frame.findFirstChild('Action');
  // @ts-expect-error Heterogeneous traversal requires narrowing before concrete property access.
  void child?.Text;
  if (child?.isA('TextButton')) {
    child.Text = 'Run';
    child.onClick((event: MouseEvent) => event.preventDefault());
  }

  fka.spring(frame, { Position: fk.udim2FromOffset(20, 40) });
  fka.createTween(frame, { Duration: 1 }, { Rotation: 20 });
  // @ts-expect-error ZIndex is discrete, not interpolated.
  fka.spring(frame, { ZIndex: 2 });
  // @ts-expect-error LayoutOrder is discrete, not interpolated.
  fka.createTween(frame, { Duration: 1 }, { LayoutOrder: 2 });
  // @ts-expect-error Booleans cannot be interpolated.
  fka.spring(frame, { Visible: false });
  // @ts-expect-error Strings cannot be interpolated.
  fka.createTween(button, { Duration: 1 }, { Text: 'Next' });
  // @ts-expect-error Frame does not expose text properties.
  fka.spring(frame, { TextSize: 20 });
  // @ts-expect-error Controllers cannot stop unsupported animation properties.
  fka.spring(frame).stop('ZIndex');
  // @ts-expect-error Animation belongs only to fka.
  fk.spring(frame, { Rotation: 20 });
  // @ts-expect-error Core factories do not belong to fka.
  fka.createFrame();
  // @ts-expect-error Hover binding requires an explicit owned scale.
  fkh.bindHoverScale(button);
  // @ts-expect-error Document options accept actual documents.
  fk.createFrame({}, { ownerDocument: window });
}

void verifyPublicTypeContracts;
