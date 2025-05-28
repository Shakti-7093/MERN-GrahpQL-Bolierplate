import { GraphQLSchema } from "graphql";
import Query from "./query/index.js";
import MutationType from "./mutations/index.js";
import Subscription from "./subscription/index.js";

const schema = new GraphQLSchema({
  query: Query,
  mutation: MutationType,
  subscription: Subscription,
});

export default schema;
