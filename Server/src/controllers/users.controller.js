// import User from "../model/users.js";
import { pubsub } from "../AsyncIterator/pubsub.js";
import { Role, User } from "../model/index.js";

export async function createUser(args) {
  const { name, email, password, role } = args;
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User already exists");
  }
  const user = await User.create({ name, email, password, role });
  const userData = { ...user.toObject(), _id: user._id.toString() };
  pubsub.emit("NEW_USER", { newUser: userData });
  return userData;
}

export async function getUsers() {
  const users = await User.find().populate("role");
  return users.map((user) => ({
    ...user.toObject(),
    _id: user._id.toString(),
    role: user.role.name,
  }));
}

export async function getUserById(id) {
  const user = await User.findById({ _id: id }).populate("role");
  return { ...user.toObject(), _id: user._id.toString(), role: user.role.name };
}

export async function updateUser(args) {
  const user = await User.findByIdAndUpdate({ _id: args.id }, args, {
    new: true,
  });
  return { ...user.toObject(), _id: user._id.toString() };
}

export async function deleteUser(id) {
  await User.findByIdAndDelete({ _id: id });
}
