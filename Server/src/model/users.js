import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
}, {
  timestamps: true,
  encryptionType: "aes-256-cbc",
  encryptionKey: process.env.ENCRYPTION_KEY,
});

const User = mongoose.model("User", userSchema);

export { User };
