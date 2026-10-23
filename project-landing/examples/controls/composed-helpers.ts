import {
  bindCheckbox,
  bindSlider,
  bindTabs,
  createFrame,
  createObservableValue,
  createTextButton,
  watchOwnedValue,
  udim2FromOffset,
} from 'framekit';

// Checkbox is behavior on a TextButton, not a new instance class.
const checked = createObservableValue(false);
const checkbox = createTextButton({ AccessibleLabel: 'Enable shadows' });
bindCheckbox(checkbox, checked);
watchOwnedValue(checkbox, checked, (value) => {
  checkbox.Text = value ? '✓ Shadows enabled' : 'Shadows disabled';
});

const volume = createObservableValue(50);
const track = createFrame({ Size: udim2FromOffset(240, 16) });
const thumb = createTextButton({
  Text: '',
  AccessibleLabel: 'Volume',
  Size: udim2FromOffset(24, 32),
});
thumb.Parent = track;
bindSlider(track, thumb, { value: volume, min: 0, max: 100, step: 5 });

// Parent tab buttons inside tablist; parent panels outside tablist.
const tablist = createFrame();
const items = ['General', 'Advanced'].map((key) => {
  const tab = createTextButton({ Text: key });
  tab.Parent = tablist;

  return { key, tab, panel: createFrame() };
});
const selection = createObservableValue('General');
bindTabs(tablist, items, { selection });
// Mount tablist, each panel, checkbox, and track in your application.
