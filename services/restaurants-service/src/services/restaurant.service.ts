import { GraphQLError } from 'graphql';
import { Restaurant, MenuItem } from '../models/restaurant.js';

export interface MenuItemInput {
  name: string;
  description?: string;
  category?: string;
  price: number;
  available?: boolean;
}

export function listRestaurants(cuisine?: string) {
  return Restaurant.find(cuisine ? { cuisine } : {}).sort({ name: 1 }).exec();
}

export async function getOwnedRestaurant(ownerId: string) {
  const restaurant = await Restaurant.findOne({ ownerId }).exec();
  if (!restaurant) {
    throw new GraphQLError('За пользователем не закреплён ресторан', { extensions: { code: 'NOT_FOUND' } });
  }
  return restaurant;
}

export function getMenu(restaurantId: string, onlyAvailable = false) {
  return MenuItem.find({ restaurantId, ...(onlyAvailable ? { available: true } : {}) }).sort({ category: 1, name: 1 }).exec();
}

export async function addMenuItem(ownerId: string, input: MenuItemInput) {
  if (input.price < 0) {
    throw new GraphQLError('Цена не может быть отрицательной', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const restaurant = await getOwnedRestaurant(ownerId);
  return MenuItem.create({ ...input, restaurantId: restaurant._id });
}

export async function updateMenuItem(ownerId: string, id: string, input: Partial<MenuItemInput>) {
  const restaurant = await getOwnedRestaurant(ownerId);
  const item = await MenuItem.findOneAndUpdate({ _id: id, restaurantId: restaurant._id }, input, { new: true });
  if (!item) throw new GraphQLError('Блюдо не найдено', { extensions: { code: 'NOT_FOUND' } });
  return item;
}

export async function setOpen(ownerId: string, isOpen: boolean) {
  const restaurant = await getOwnedRestaurant(ownerId);
  restaurant.isOpen = isOpen;
  return restaurant.save();
}

const SEED = [
  {
    restaurant: {
      name: 'Пиццерия «Наполи»',
      description: 'Неаполитанская пицца из дровяной печи',
      address: 'Москва, ул. Стромынка, 20',
      cuisine: 'Итальянская',
      ownerId: '000000000000000000000002',
      avgCookingMinutes: 20,
    },
    menu: [
      { name: 'Маргарита', category: 'Пицца', price: 590, description: 'Томаты, моцарелла, базилик' },
      { name: 'Пепперони', category: 'Пицца', price: 690, description: 'Пикантная колбаса пепперони' },
      { name: 'Четыре сыра', category: 'Пицца', price: 750, description: 'Моцарелла, горгонзола, пармезан, чеддер' },
      { name: 'Цезарь с курицей', category: 'Салаты', price: 420 },
      { name: 'Тирамису', category: 'Десерты', price: 350 },
      { name: 'Лимонад домашний', category: 'Напитки', price: 190 },
    ],
  },
  {
    restaurant: {
      name: 'Суши-бар «Васаби»',
      description: 'Роллы и горячие блюда японской кухни',
      address: 'Москва, пр. Вернадского, 78',
      cuisine: 'Японская',
      ownerId: '000000000000000000000004',
      avgCookingMinutes: 30,
    },
    menu: [
      { name: 'Филадельфия', category: 'Роллы', price: 640, description: 'Лосось, сливочный сыр, огурец' },
      { name: 'Калифорния', category: 'Роллы', price: 520, description: 'Краб, авокадо, икра тобико' },
      { name: 'Мисо-суп', category: 'Супы', price: 260 },
      { name: 'Вок с курицей', category: 'Горячее', price: 450 },
      { name: 'Зелёный чай', category: 'Напитки', price: 150 },
    ],
  },
];

export async function seedDemoData(): Promise<void> {
  if ((await Restaurant.estimatedDocumentCount()) > 0) return;
  for (const { restaurant, menu } of SEED) {
    const r = await Restaurant.create(restaurant);
    await MenuItem.insertMany(menu.map((m) => ({ ...m, restaurantId: r._id })));
  }
  console.log('Созданы демо-рестораны и меню');
}
