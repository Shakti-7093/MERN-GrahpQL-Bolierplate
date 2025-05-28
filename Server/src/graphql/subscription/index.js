import { GraphQLObjectType } from "graphql";
import { createAsyncIterator } from "../../AsyncIterator/pubsub.js";
import UserType from "../types/Users.js";
import TodoType from "../types/Todo.js";

const Subscription = new GraphQLObjectType({
  name: "Subscription",
  fields: () => ({
    newUser: {
      type: UserType,
      subscribe: () => {
        const asyncIterator = createAsyncIterator("NEW_USER");
        return {
          [Symbol.asyncIterator]: () => asyncIterator,
          return: () => {
            console.log("[GraphQL] Cleaning up NEW_USER subscription");
            return asyncIterator.return();
          }
        };
      },
      resolve: (payload) => {
        console.log("[GraphQL] Resolving NEW_USER subscription payload");
        return payload.newUser;
      },
    },
    newTodo: {
      type: TodoType,
      subscribe: () => {
        const asyncIterator = createAsyncIterator("NEW_TODO");
        return {
          [Symbol.asyncIterator]: () => asyncIterator,
          return: () => {
            console.log("[GraphQL] Cleaning up NEW_TODO subscription");
            return asyncIterator.return();
          }
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
