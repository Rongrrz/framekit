const dispose = bindPopover(button, dropdown, {
  openOn: 'hover',
  placement: 'bottom',
  onShow: ({ content, signal }) => animateIn(content, signal),
  onHide: ({ content, signal }) => animateOut(content, signal),
});
// Return a promise to finish hiding after your animation.
// Honor signal to cancel on re-entry or disposal.
// The same hooks work with bindTooltip().
// Omit hooks for the built-in spring and reduced-motion support.
