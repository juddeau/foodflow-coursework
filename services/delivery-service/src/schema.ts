import { gql } from 'graphql-tag';

export const typeDefs = gql`

  type User {
    id: ID!
  }

  "Ссылка на заказ по идентификатору"
  type Order {
    id: ID!
    delivery: Delivery
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

  type Query {
    deliveryByOrder(orderId: ID!): Delivery
    availableDeliveries: [Delivery!]!
    myDeliveries: [Delivery!]!
  }

  type Mutation {
    acceptDelivery(id: ID!): Delivery!
    pickUpDelivery(id: ID!): Delivery!
    completeDelivery(id: ID!): Delivery!
  }
`;
