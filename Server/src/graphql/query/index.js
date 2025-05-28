import { GraphQLObjectType, GraphQLID, GraphQLList } from "graphql";
import UserType from "../types/Users.js";
import TodoType from "../types/Todo.js";
import { getUserById, getUsers } from "../../controllers/users.controller.js";
import { getTodos, getTodoById } from "../../controllers/todo.controller.js";

const Query = new GraphQLObjectType({
  name: "Query",
  fields: () => ({
    user: {
      type: new GraphQLList(UserType),
      args: { id: { type: GraphQLID } },
      resolve: async (root, args) => {
        const user = await getUserById(args.id);
        if (!user) {
          throw new Error("User not found");
        }
        return [user];
      },
    },
    users: {
      type: new GraphQLList(UserType),
      resolve: async () => await getUsers(),
    },
    todos: {
      type: new GraphQLList(TodoType),
      resolve: async () => await getTodos(),
    },
    todo: {
      type: new GraphQLList(TodoType),
      args: { id: { type: GraphQLID } },
      resolve: async (root, args) => {
        const todo = await getTodoById(args.id);
        if (!todo) {
          throw new Error("Todo not found");
        }
        return [todo];
      },
    },
  }),
});

export default Query;
