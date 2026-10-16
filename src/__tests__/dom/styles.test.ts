import { expect, it, vi } from 'vitest';

import {
  createStyledElementFactory,
  removeStyle,
  setStyle,
  setStyleLayer,
} from '#internal/dom/styles.js';

it('preserves unmanaged inline defaults through cloned layout overrides', () => {
  const template = document.createElement('div');
  template.style.width = '10px';

  const createElement = createStyledElementFactory(template);
  const first = createElement();
  setStyleLayer(first, 'layout', { width: '20px' });
  setStyleLayer(first, 'layout', {});
  expect(first.style.width).toBe('10px');
  expect(createElement().style.width).toBe('10px');
});

it('captures default styles independently and lets instances remove inherited owners', () => {
  const template = document.createElement('div');
  template.style.paddingLeft = '7px';
  setStyle(template, 'width', '10px');
  setStyleLayer(template, 'modifier', { width: '30px', 'padding-left': '12px' });

  const createElement = createStyledElementFactory(template);
  setStyle(template, 'width', '40px');
  setStyleLayer(template, 'modifier', {});

  const first = createElement();
  const second = createElement();
  expect(first.style.width).toBe('30px');
  expect(first.style.paddingLeft).toBe('12px');
  setStyle(first, 'width', '20px');
  setStyleLayer(first, 'modifier', {});
  expect(first.style.width).toBe('20px');
  expect(first.style.paddingLeft).toBe('7px');
  expect(second.style.width).toBe('30px');
  removeStyle(first, 'width');
  expect(first.style.width).toBe('');
  setStyleLayer(first, 'layout', { width: '50px' });
  setStyleLayer(first, 'layout', {});
  expect(first.style.width).toBe('');
  setStyle(first, 'width', '10px');
  expect(first.style.width).toBe('10px');
  expect(template.style.width).toBe('40px');
  expect(createElement().style.width).toBe('30px');
});

it('retries a failed base write without confusing inherited rendered defaults', () => {
  const template = document.createElement('div');
  setStyle(template, 'width', '10px');

  const element = createStyledElementFactory(template)();

  const failure = vi.spyOn(element.style, 'setProperty').mockImplementationOnce(() => {
    throw new Error('Write failed');
  });

  expect(() => setStyle(element, 'width', '20px')).toThrow('Write failed');
  setStyle(element, 'width', '20px');
  expect(element.style.width).toBe('20px');
  failure.mockRestore();
});

it('captures inherited style defaults when preparing another generation of elements', () => {
  const template = document.createElement('div');
  setStyle(template, 'width', '10px');

  const first = createStyledElementFactory(template)();
  setStyle(first, 'height', '20px');
  removeStyle(first, 'width');

  const second = createStyledElementFactory(first)();
  setStyleLayer(second, 'layout', { height: '30px', width: '40px' });
  setStyleLayer(second, 'layout', {});
  expect(second.style.width).toBe('');
  expect(second.style.height).toBe('20px');
  expect(first.style.height).toBe('20px');
});

it('keeps initially empty owners independent across elements and repeated removal', () => {
  const first = document.createElement('div');
  const second = document.createElement('div');
  setStyle(first, 'width', '10px');
  setStyle(second, 'width', '20px');

  for (const layer of ['modifier', 'layout', 'parent-layout'] as const) {
    setStyleLayer(first, layer, { width: '30px' });
    expect(first.style.width).toBe('30px');
    expect(second.style.width).toBe('20px');
    setStyleLayer(second, layer, { width: '40px' });
    setStyleLayer(first, layer, {});
    setStyleLayer(first, layer, {});
    expect(first.style.width).toBe('10px');
    expect(second.style.width).toBe('40px');
    setStyleLayer(second, layer, {});
    expect(second.style.width).toBe('20px');
  }
});

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
