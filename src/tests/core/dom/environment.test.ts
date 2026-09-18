import { describe, expect, it } from 'vitest';

import { fk } from '../../../index.js';
import { resetDocumentAfterEach } from '../../support/reset-document.js';

resetDocumentAfterEach();

describe('DOM ownership', () => {
  it('creates factory DOM and injected styles in the selected document', () => {
    const iframe = document.body.appendChild(document.createElement('iframe'));
    const ownerDocument = iframe.contentDocument!;
    const options = { ownerDocument };
    const nodes = [
      fk.createFrame({}, options),
      fk.createTextLabel({}, options),
      fk.createTextButton({}, options),
      fk.createImageLabel({}, options),
      fk.createImageButton({}, options),
      fk.createLink({}, options),
      fk.createScrollingFrame({}, options),
      fk.createTextInput({}, options),
      fk.createTextArea({}, options),
    ];

    for (const node of nodes) {
      expect(node.unsafeElement.ownerDocument).toBe(ownerDocument);
      for (const child of node.unsafeElement.children) {
        expect(child.ownerDocument).toBe(ownerDocument);
      }
      node.destroy();
    }

    expect(ownerDocument.querySelectorAll('[data-framekit-styles]')).toHaveLength(1);
  });

  it('resolves mounts in the selected document and rejects implicit adoption', () => {
    const ownerDocument = document.implementation.createHTMLDocument();
    const target = ownerDocument.body.appendChild(ownerDocument.createElement('main'));
    target.id = 'app';
    const gui = fk.createScreenGui({}, { ownerDocument });
    const frame = fk.createFrame({}, { ownerDocument });

    gui.mount('#app');
    frame.Parent = gui;

    expect(target.firstElementChild).toBe(gui.unsafeElement);
    expect(() => gui.mount(document.body)).toThrow(/different document/);
    expect(() => (fk.createFrame().Parent = frame)).toThrow(/same document/);
    expect(gui.isMounted()).toBe(true);

    gui.destroy();
  });
});
