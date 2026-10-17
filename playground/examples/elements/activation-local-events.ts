import { createTextButton } from 'framekit';

const save = createTextButton({ Text: 'Save', AccessibleLabel: 'Save profile' });

const stop = save.onClick(() => console.log('Save requested'));

save.on('focus', () => console.log('Save has keyboard focus'));

stop(); // Stop this subscription before destruction.
