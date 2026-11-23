import { gql } from 'graphql-tag';

export const typeDefs = gql`

  type User {
    id: ID!
  }

  type Restaurant {
    id: ID!
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

  type Query {
    deliveryOrder(id: ID!): Order
    order(id: ID!): Order
    myOrders: [Order!]!
    restaurantOrders(status: OrderStatus): [Order!]!
  }

  type Mutation {
    placeOrder(input: PlaceOrderInput!): Order!
    cancelOrder(id: ID!): Order!
    updateOrderStatus(id: ID!, status: OrderStatus!): Order!
  }
`;
