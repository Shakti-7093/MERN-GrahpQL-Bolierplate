import { GraphQLObjectType } from "graphql";
import { createAsyncIterator } from "../../AsyncIterator/pubsub.js";
import UserType from "../types/Users.js";
import TodoType from "../types/Todo.js";

const Subscription = new GraphQLObjectType({
  name: "Subscription",
  fields: () => ({
    newUser: {
      type: UserType,
      subscribe: (_, __, context) => {
        const clientId =
          context?.extra?.socket?.clientId || `anonymous_${Date.now()}`;
        console.log(
          `[GraphQL] Creating NEW_USER subscription for client ${clientId}`
        );
        const asyncIterator = createAsyncIterator("NEW_USER", clientId);
        return {
          [Symbol.asyncIterator]: () => asyncIterator,
          return: () => {
            console.log(
              `[GraphQL] Cleaning up NEW_USER subscription for client ${clientId}`
            );
            return asyncIterator.return();
          },
        };
      },
      resolve: (payload) => {
        console.log("[GraphQL] Resolving NEW_USER subscription payload");
        return payload.newUser;
      },
    },
    newTodo: {
      type: TodoType,
      subscribe: (_, __, context) => {
        const clientId =
          context?.extra?.socket?.clientId || `anonymous_${Date.now()}`;
        console.log(
          `[GraphQL] Creating NEW_TODO subscription for client ${clientId}`
        );
        const asyncIterator = createAsyncIterator("NEW_TODO", clientId);
        return {
          [Symbol.asyncIterator]: () => asyncIterator,
          return: () => {
            console.log(
              `[GraphQL] Cleaning up NEW_TODO subscription for client ${clientId}`
            );
            return asyncIterator.return();
          },
        };
      },
      resolve: (payload) => {
        console.log("[GraphQL] Resolving NEW_TODO subscription payload");
        return payload.newTodo;
      },
    },
  }),
});

export default Subscription;
