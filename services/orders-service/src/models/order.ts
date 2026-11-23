import { Schema, model } from 'mongoose';

const STATUSES = ['CREATED', 'ACCEPTED', 'READY', 'PICKED_UP', 'DELIVERED', 'CANCELLED'];

const orderSchema = new Schema(
  {
    customerId: { type: String, required: true, index: true },
    restaurantId: { type: String, required: true },
    restaurantOwnerId: { type: String, required: true, index: true },
    restaurantName: { type: String, required: true },
    restaurantAddress: { type: String, required: true },
    // Снимок позиций: название и цена фиксируются на момент заказа
    items: [
      {
        _id: false,
        menuItemId: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    total: { type: Number, required: true },
    address: { type: String, required: true },
    comment: { type: String, default: '' },
    status: { type: String, enum: STATUSES, default: 'CREATED', index: true },
    statusHistory: [{ _id: false, status: String, at: { type: Date, default: Date.now } }],
    courierId: { type: String, default: null },
  },
  { timestamps: true },
);

export const Order = model('Order', orderSchema);
