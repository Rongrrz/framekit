const stopTree = bindTreeView(tree, visibleRows, {
  onSelect: (node) => updateSelection(node),
  onToggle: (node, expanded) => updateExpansion(node, expanded),
});
// Publish depth-first rows: { node, label, level, selected?, expanded? }.
// Omit collapsed descendants. stopTree() restores original ARIA/tab stops.
