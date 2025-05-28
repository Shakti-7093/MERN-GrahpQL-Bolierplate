import { GraphQLObjectType, GraphQLString } from "graphql";
import TodoType from "../../types/Todo.js";

const CreateTodoResponseType = new GraphQLObjectType({
  name: "CreateTodoResponse",
  fields: () => ({
    message: { type: GraphQLString },
    todo: { type: TodoType },
  }),
});

export default CreateTodoResponseType;