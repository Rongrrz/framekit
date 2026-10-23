import { createTextButton, bindTooltip } from 'framekit';

const button = createTextButton({ Text: 'Save' });

const dispose = bindTooltip(button, 'Save your changes', {
  placement: 'top',
  gap: 8,
  delay: 200,
});
// dispose(); // Or destroy the target to release the binding.
