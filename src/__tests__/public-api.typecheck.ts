import {
  bindHoverScale,
  bindPopover,
  bindResponsiveLayout,
  bindTooltip,
  color3FromRGB,
  createFrame,
  createObservableValue,
  createScreenGui,
  createSignalEmitter,
  createTextButton,
  createTextLabel,
  createTween,
  createUIGridLayout,
  createUIScale,
  type FloatingPanelHook,
  type Frame,
  type GuiElement,
  type GuiObject,
  type Instance,
  installFrameKitStyles,
  type ObservableValue,
  type ResponsiveLayoutContext,
  type SignalEmitter,
  spring,
  type TooltipOptions,
  udim2FromOffset,
  type Unsubscribe,
  vector2,
} from 'framekit';

/** Never executed: TypeScript must reject every marked call during the normal typecheck. */
function verifyPublicTypeContracts(): void {
  const frame = createFrame();
  const frameViews: readonly [Frame, Instance, GuiElement, GuiObject] = [
    frame,
    frame,
    frame,
    frame,
  ];
  void frameViews;
  const button = createTextButton();
  const scale = createUIScale();
  const grid = createUIGridLayout({ FillDirectionMaxCells: 3 });
  grid.Parent = frame;
  const observableValue: ObservableValue<number> = createObservableValue(1);
  observableValue.set(2);
  const signalEmitter: SignalEmitter<[number]> = createSignalEmitter<[number]>();
  signalEmitter.emit(observableValue.get());
  installFrameKitStyles();
  scale.Parent = button;
  const dispose: Unsubscribe = bindHoverScale(button, scale);
  void dispose;
  const tooltipOptions: TooltipOptions = {
    followCursor: true,
    style: { TextColor3: color3FromRGB(255, 255, 255) },
  };
  const disposeTooltip: Unsubscribe = bindTooltip(button, 'Save', tooltipOptions);
  void disposeTooltip;
  bindTooltip(frame, createTextLabel(), { placement: 'right' });
  const animatePanel: FloatingPanelHook = ({ content, signal }) => {
    content.BackgroundTransparency = 0;
    signal.addEventListener('abort', () => undefined);
    return Promise.resolve();
  };
  bindTooltip(button, 'Save', { onShow: animatePanel, onHide: animatePanel });
  const disposePopover: Unsubscribe = bindPopover(button, frame, {
    openOn: 'hover',
    placement: 'bottom',
    onShow: animatePanel,
    onHide: animatePanel,
  });
  void disposePopover;
  const applyContainerLayout = ({ width, height }: ResponsiveLayoutContext): void => {
    frame.Size = udim2FromOffset(width, height);
  };
  const disposeResponsiveLayout: Unsubscribe = bindResponsiveLayout(frame, {
    observe: frame,
    breakpoints: [{ maxWidth: 479, apply: applyContainerLayout }, { apply: applyContainerLayout }],
  });
  void disposeResponsiveLayout;
  // @ts-expect-error Container breakpoint widths are numeric.
  bindResponsiveLayout(frame, { observe: frame, breakpoints: [{ maxWidth: 'small', apply() {} }] });
  // @ts-expect-error Popovers require caller-owned GUI content.
  bindPopover(button, 'Actions');
  // @ts-expect-error Unsupported triggers are not accepted.
  bindPopover(button, frame, { openOn: 'focus' });
  // @ts-expect-error Interactive popovers remain anchored.
  bindPopover(button, frame, { followCursor: true });
  // @ts-expect-error Hooks settle without returning a value.
  bindTooltip(button, 'Save', { onHide: () => Promise.resolve(42) });
  // @ts-expect-error Tooltips need a DOM-backed target.
  bindTooltip(scale, 'Scale');
  // @ts-expect-error Tooltip content is text or a rectangular GUI instance.
  bindTooltip(button, createScreenGui());
  // @ts-expect-error Placement accepts only supported sides.
  bindTooltip(button, 'Save', { placement: 'cursor' });
  // @ts-expect-error Generated tooltip styles do not own positioning.
  bindTooltip(button, 'Save', { style: { Position: udim2FromOffset(0, 0) } });

  // @ts-expect-error Unknown constructor properties are not accepted.
  createFrame({ Typo: true });
  // @ts-expect-error Invalid enum members are not accepted.
  frame.AutomaticSize = 'EveryAxis';
  // @ts-expect-error GUI parentage is not raw DOM parentage.
  frame.Parent = document.body;
  // @ts-expect-error Browser geometry is readonly.
  frame.AbsoluteSize = vector2(100, 100);
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

  spring(frame, { Position: udim2FromOffset(20, 40) });
  createTween(frame, { Duration: 1 }, { Rotation: 20 });
  // @ts-expect-error ZIndex is discrete, not interpolated.
  spring(frame, { ZIndex: 2 });
  // @ts-expect-error LayoutOrder is discrete, not interpolated.
  createTween(frame, { Duration: 1 }, { LayoutOrder: 2 });
  // @ts-expect-error Booleans cannot be interpolated.
  spring(frame, { Visible: false });
  // @ts-expect-error Strings cannot be interpolated.
  createTween(button, { Duration: 1 }, { Text: 'Next' });
  // @ts-expect-error Frame does not expose text properties.
  spring(frame, { TextSize: 20 });
  // @ts-expect-error Controllers cannot stop unsupported animation properties.
  spring(frame).stop('ZIndex');
  // @ts-expect-error Hover binding requires an explicit owned scale.
  bindHoverScale(button);
  // @ts-expect-error Document options accept actual documents.
  createFrame({}, { ownerDocument: window });
}

void verifyPublicTypeContracts;
