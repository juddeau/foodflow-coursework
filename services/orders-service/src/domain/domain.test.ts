import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, isFinal } from './order-status.js';
import { calculateTotals, DELIVERY_FEE } from './pricing.js';

test('ресторан принимает новый заказ, клиент не может', () => {
  assert.equal(canTransition('CREATED', 'ACCEPTED', 'RESTAURANT'), true);
  assert.equal(canTransition('CREATED', 'ACCEPTED', 'CUSTOMER'), false);
});

test('клиент отменяет только неподтверждённый заказ', () => {
  assert.equal(canTransition('CREATED', 'CANCELLED', 'CUSTOMER'), true);
  assert.equal(canTransition('ACCEPTED', 'CANCELLED', 'CUSTOMER'), false);
});

test('статусы доставки меняются только событиями системы', () => {
  assert.equal(canTransition('READY', 'PICKED_UP', 'COURIER'), false);
  assert.equal(canTransition('READY', 'PICKED_UP', 'SYSTEM'), true);
  assert.equal(canTransition('PICKED_UP', 'DELIVERED', 'SYSTEM'), true);
});

test('доставленный и отменённый заказы конечные', () => {
  assert.equal(isFinal('DELIVERED'), true);
  assert.equal(isFinal('CANCELLED'), true);
  assert.equal(isFinal('READY'), false);
});

test('стоимость доставки добавляется к небольшому заказу', () => {
  const t = calculateTotals([{ price: 590, quantity: 1 }, { price: 190, quantity: 2 }]);
  assert.deepEqual(t, { subtotal: 970, deliveryFee: DELIVERY_FEE, total: 970 + DELIVERY_FEE });
});

test('от 1500 ₽ доставка бесплатная', () => {
  const t = calculateTotals([{ price: 750, quantity: 2 }]);
  assert.equal(t.deliveryFee, 0);
  assert.equal(t.total, 1500);
});

test('пустой заказ и неверное количество отклоняются', () => {
  assert.throws(() => calculateTotals([]));
  assert.throws(() => calculateTotals([{ price: 100, quantity: 0 }]));
  assert.throws(() => calculateTotals([{ price: 100, quantity: 1.5 }]));
});
