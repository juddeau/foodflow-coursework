export const typeDefs = `
enum Role {

    CUSTOMER
    RESTAURANT
    COURIER
  
}

type User {

    id: ID!
    email: String!
    name: String!
    phone: String
    role: Role!
  
}

type AuthPayload {

    token: String!
    user: User!
  
}

input RegisterInput {

    email: String!
    password: String!
    name: String!
    phone: String
    role: Role!
  
}

type Query {
me: User

restaurants(cuisine: String): [Restaurant!]!
restaurant(id: ID!): Restaurant
myRestaurant: Restaurant
menuItemsByIds(ids: [ID!]!): [MenuItem!]!
order(id: ID!): Order
myOrders: [Order!]!
restaurantOrders(status: OrderStatus): [Order!]!

availableDeliveries: [Delivery!]!
myDeliveries: [Delivery!]!
}

type Mutation {
register(input: RegisterInput!): AuthPayload!
login(email: String!, password: String!): AuthPayload!
addMenuItem(input: MenuItemInput!): MenuItem!
updateMenuItem(id: ID!, input: MenuItemUpdate!): MenuItem!
setRestaurantOpen(isOpen: Boolean!): Restaurant!
placeOrder(input: PlaceOrderInput!): Order!
cancelOrder(id: ID!): Order!
updateOrderStatus(id: ID!, status: OrderStatus!): Order!
acceptDelivery(id: ID!): Delivery!
pickUpDelivery(id: ID!): Delivery!
completeDelivery(id: ID!): Delivery!
}

type Restaurant {

    id: ID!
    name: String!
    description: String
    address: String!
    cuisine: String!
    isOpen: Boolean!
    avgCookingMinutes: Int!
    owner: User!
    menu(onlyAvailable: Boolean = false): [MenuItem!]!
  
}

type MenuItem {

    id: ID!
    name: String!
    description: String
    category: String!
    price: Float!
    available: Boolean!
    restaurant: Restaurant!
  
}

input MenuItemInput {

    name: String!
    description: String
    category: String
    price: Float!
    available: Boolean
  
}

input MenuItemUpdate {

    name: String
    description: String
    category: String
    price: Float
    available: Boolean
  
}

enum OrderStatus {

    CREATED
    ACCEPTED
    READY
    PICKED_UP
    DELIVERED
    CANCELLED
  
}

type OrderItem {

    menuItemId: ID!
    name: String!
    price: Float!
    quantity: Int!
  
}

type StatusChange {

    status: OrderStatus!
    at: String!
  
}

type Order {

    id: ID!
    customer: User!
    restaurant: Restaurant!
    restaurantName: String!
    items: [OrderItem!]!
    subtotal: Float!
    deliveryFee: Float!
    total: Float!
    address: String!
    comment: String
    status: OrderStatus!
    statusHistory: [StatusChange!]!
    courier: User
    createdAt: String!
  
 delivery: Delivery

}

input OrderItemInput {

    menuItemId: ID!
    quantity: Int!
  
}

input PlaceOrderInput {

    restaurantId: ID!
    items: [OrderItemInput!]!
    address: String!
    comment: String
  
}

enum DeliveryStatus {

    WAITING_COURIER
    ASSIGNED
    PICKED_UP
    DELIVERED
  
}

type Delivery {

    id: ID!
    order: Order!
    restaurantName: String!
    pickupAddress: String!
    dropoffAddress: String!
    status: DeliveryStatus!
    courier: User
    assignedAt: String
    pickedUpAt: String
    deliveredAt: String
  
}
`;
