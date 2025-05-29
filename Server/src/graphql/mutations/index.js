import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLID,
} from "graphql";
import UserType from "../types/Users.js";
import {
  publish,
  getActiveSubscriptionCount,
} from "../../AsyncIterator/pubsub.js";
import { createUser } from "../../controllers/users.controller.js";
import { createTodo } from "../../controllers/todo.controller.js";
import CreateTodoResponseType from "./messages/todo.js";

const MutationType = new GraphQLObjectType({
  name: "Mutation",
  fields: () => ({
    createUser: {
      type: UserType,
      args: {
        name: { type: GraphQLString },
        email: { type: GraphQLString },
        password: { type: GraphQLString },
        role: { type: GraphQLString },
      },
      resolve: async (root, args) => {
        const newUser = {
          name: args.name,
          email: args.email,
          password: args.password,
          role: args.role,
        };

        const user = await createUser(newUser);
        const activeSubscriptions = getActiveSubscriptionCount("NEW_USER");
        if (activeSubscriptions > 0) {
          console.log(
            `[GraphQL] Publishing NEW_USER event to ${activeSubscriptions} subscribers`
          );
          publish("NEW_USER", { newUser: user });
        }
        return user;
      },
    },
    createTodo: {
      type: CreateTodoResponseType,
      args: {
        title: { type: GraphQLString },
        description: { type: GraphQLString },
        completed: { type: GraphQLBoolean },
        userID: { type: GraphQLID },
      },
      resolve: async (root, args) => {
        const newTodo = {
          title: args.title,
          description: args.description,
          completed: args.completed,
          userID: args.userID,
        };
        const todo = await createTodo(newTodo);
        const activeSubscriptions = getActiveSubscriptionCount("NEW_TODO");
        if (activeSubscriptions > 0) {
          console.log(
            `[GraphQL] Publishing NEW_TODO event to ${activeSubscriptions} subscribers`
          );
          publish("NEW_TODO", { newTodo: todo });
        }
        return {
          message: "Todo created successfully",
          todo: todo,
        };
      },
    },
  }),
});

export default MutationType;
