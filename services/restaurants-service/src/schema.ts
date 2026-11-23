import { gql } from 'graphql-tag';

export const typeDefs = gql`

  type User {
    id: ID!
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

  type Query {
    restaurants(cuisine: String): [Restaurant!]!
    restaurant(id: ID!): Restaurant
    myRestaurant: Restaurant
    "Служебный запрос для orders-service: актуальные цены и доступность блюд"
    menuItemsByIds(ids: [ID!]!): [MenuItem!]!
  }

  type Mutation {
    addMenuItem(input: MenuItemInput!): MenuItem!
    updateMenuItem(id: ID!, input: MenuItemUpdate!): MenuItem!
    setRestaurantOpen(isOpen: Boolean!): Restaurant!
  }
`;
