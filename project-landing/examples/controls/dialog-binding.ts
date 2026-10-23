const dialog = createFrame({ TagName: 'dialog' });

dialog.unsafeElement.setAttribute('aria-label', 'Confirm action');

const modal = bindDialog(dialog, { initialFocus: closeButton });

opener.onClick(() => modal.open(opener));

closeButton.onClick(modal.close);
// modal.dispose(); // Closes and releases listeners; keeps caller content.
