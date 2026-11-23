import { gql } from 'graphql-tag';

export const typeDefs = gql`

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
    user(id: ID!): User
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
  }
`;
