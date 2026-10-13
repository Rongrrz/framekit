import { expect, it } from 'vitest';

import {
  removeStyle,
  setStyle,
  setStyleLayer,
  setStyleLayerProperty,
} from '#internal/dom/styles.js';

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

it('updates one derived declaration while retaining placement rules and layer precedence', () => {
  const element = document.createElement('div');
  element.style.order = '7';
  setStyleLayerProperty(element, 'modifier', 'order', '8');
  setStyleLayer(element, 'parent-layout', { position: 'relative', order: '2' });
  setStyleLayerProperty(element, 'modifier', 'order', '9');
  expect(element.style.order).toBe('2');
  setStyleLayerProperty(element, 'parent-layout', 'order', '1');
  expect(element.style.order).toBe('1');
  expect(element.style.position).toBe('relative');
  setStyleLayer(element, 'parent-layout', {});
  expect(element.style.order).toBe('9');
  setStyleLayer(element, 'modifier', {});
  expect(element.style.order).toBe('7');
});
