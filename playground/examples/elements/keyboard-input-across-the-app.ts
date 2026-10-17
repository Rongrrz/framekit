import { createScreenGui, createUserInputService } from 'framekit';

const app = createScreenGui();

const input = createUserInputService(app);

input.inputBegan.subscribe((event, processed) => {
  if (processed || event.altKey || event.shiftKey) return;

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    console.log('Save requested');
  }
});

app.mount('#app');
