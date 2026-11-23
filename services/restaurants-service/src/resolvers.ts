import { Restaurant, MenuItem } from './models/restaurant.js';
import * as svc from './services/restaurant.service.js';
import { Context, requireUser } from './context.js';

type Parent = { _id: unknown; restaurantId?: unknown; ownerId?: string };

export const resolvers = {
  Query: {
    restaurants: (_: unknown, { cuisine }: { cuisine?: string }) => svc.listRestaurants(cuisine),
    restaurant: (_: unknown, { id }: { id: string }) => Restaurant.findById(id).exec(),
    myRestaurant: (_: unknown, __: unknown, ctx: Context) =>
      svc.getOwnedRestaurant(requireUser(ctx, 'RESTAURANT').id),
    menuItemsByIds: (_: unknown, { ids }: { ids: string[] }) => MenuItem.find({ _id: { $in: ids } }).exec(),
  },
  Mutation: {
    addMenuItem: (_: unknown, { input }: { input: svc.MenuItemInput }, ctx: Context) =>
      svc.addMenuItem(requireUser(ctx, 'RESTAURANT').id, input),
    updateMenuItem: (_: unknown, args: { id: string; input: Partial<svc.MenuItemInput> }, ctx: Context) =>
      svc.updateMenuItem(requireUser(ctx, 'RESTAURANT').id, args.id, args.input),
    setRestaurantOpen: (_: unknown, { isOpen }: { isOpen: boolean }, ctx: Context) =>
      svc.setOpen(requireUser(ctx, 'RESTAURANT').id, isOpen),
  },
  Restaurant: {
    owner: (r: Parent) => ({ __typename: 'User', id: r.ownerId }),
    menu: (r: Parent, { onlyAvailable }: { onlyAvailable: boolean }) => svc.getMenu(String(r._id), onlyAvailable),
  },
  MenuItem: {
    restaurant: (m: Parent) => Restaurant.findById(m.restaurantId).exec(),
  },
};
