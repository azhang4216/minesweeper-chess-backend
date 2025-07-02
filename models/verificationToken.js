import mongoose from "mongoose";

const verificationTokenSchema = new mongoose.Schema({
  email: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true }, // hashed
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true }
});

export default mongoose.model("VerificationToken", verificationTokenSchema);
