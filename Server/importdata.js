import { Role, User } from "./src/model/index.js";
import users from "./data/users.js";
import roles from "./data/role.js";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const DB = process.env.DATABASE_URL;

mongoose.connect(DB).then(() => {
    console.log("DB connection successful!");
}).catch((err) => {
    console.log("DB connection failed!");
    console.log(err);
});

const importData = async () => {
    // await Role.deleteMany();
    // await Role.insertMany(roles);

    await User.deleteMany();
    await User.insertMany(users);
};

importData().then(() => {
    console.log("Data imported successfully!");
    mongoose.connection.close();
    process.exit(0);
}).catch((err) => {
    console.log("Data import failed!");
    console.log(err);
    mongoose.connection.close();
    process.exit(1);
});