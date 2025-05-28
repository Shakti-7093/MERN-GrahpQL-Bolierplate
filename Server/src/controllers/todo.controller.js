import { pubsub } from "../AsyncIterator/pubsub.js";
import { Todo } from "../model/index.js";

export async function createTodo(args) {
  const { title, description, completed, userID } = args;
  const todo = await Todo.create({ title, description, completed, userID });
  pubsub.emit("NEW_TODO", { newTodo: todo });
  return { ...todo.toObject(), _id: todo._id.toString(), userID: todo.userID.toString() };
}

export async function getTodos() {
  const todos = await Todo.find();
  return todos.map((todo) => ({ ...todo.toObject(), _id: todo._id.toString(), userID: todo.userID.toString() }));
}

export async function getTodoById(id) {
  const todo = await Todo.findById({ _id: id });
  return { ...todo.toObject(), _id: todo._id.toString(), userID: todo.userID.toString() };
}

export async function updateTodo(args) {
  const todo = await Todo.findByIdAndUpdate({ _id: args.id }, args, { new: true });
  return { ...todo.toObject(), _id: todo._id.toString(), userID: todo.userID.toString() };
}

export async function deleteTodo(id) {
  await Todo.findByIdAndDelete({ _id: id });
}