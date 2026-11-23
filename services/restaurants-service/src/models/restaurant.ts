import { Schema, model } from 'mongoose';

const restaurantSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    address: { type: String, required: true },
    cuisine: { type: String, required: true },
    ownerId: { type: String, required: true, index: true },
    isOpen: { type: Boolean, default: true },
    avgCookingMinutes: { type: Number, default: 25 },
  },
  { timestamps: true },
);

export const Restaurant = model('Restaurant', restaurantSchema);

const menuItemSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'Основное' },
    price: { type: Number, required: true, min: 0 },
    available: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const MenuItem = model('MenuItem', menuItemSchema);
