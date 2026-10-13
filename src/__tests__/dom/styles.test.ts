import { expect, it } from 'vitest';

import { removeStyle, setStyle, setStyleLayer } from '#internal/dom/styles.js';

it('restores the next style owner and original inline values as layers are removed', () => {
  const element = document.createElement('div');
  element.style.paddingLeft = '7px';
  setStyleLayer(element, 'modifier', { 'padding-left': '12px' });
  setStyleLayer(element, 'layout', { 'padding-left': '20px' });
  setStyleLayer(element, 'parent-layout', { 'padding-left': '30px' });
  setStyle(element, 'padding-left', '4px');
  expect(element.style.paddingLeft).toBe('30px');
  setStyleLayer(element, 'parent-layout', {});
  expect(element.style.paddingLeft).toBe('20px');
  setStyleLayer(element, 'layout', {});
  expect(element.style.paddingLeft).toBe('12px');
  setStyleLayer(element, 'modifier', { 'padding-left': undefined });
  expect(element.style.paddingLeft).toBe('4px');
  setStyle(element, 'padding-left', '');
  expect(element.style.paddingLeft).toBe('');
  removeStyle(element, 'padding-left');
  expect(element.style.paddingLeft).toBe('7px');
});

it('keeps hidden base content hidden even when a layout supplies a display mode', () => {
  const element = document.createElement('div');
  setStyle(element, 'display', 'none');
  setStyleLayer(element, 'layout', { display: 'flex' });
  expect(element.style.display).toBe('none');
  setStyle(element, 'display', '');
  expect(element.style.display).toBe('flex');
  setStyleLayer(element, 'layout', {});
  expect(element.style.display).toBe('');
});
