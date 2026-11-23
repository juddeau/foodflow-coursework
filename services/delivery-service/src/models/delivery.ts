import { Schema, model } from 'mongoose';

const deliverySchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true },
    customerId: { type: String, required: true },
    restaurantName: { type: String, required: true },
    pickupAddress: { type: String, required: true },
    dropoffAddress: { type: String, required: true },
    courierId: { type: String, default: null, index: true },
    status: {
      type: String,
      enum: ['WAITING_COURIER', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'],
      default: 'WAITING_COURIER',
      index: true,
    },
    assignedAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,
  },
  { timestamps: true },
);

export const Delivery = model('Delivery', deliverySchema);
