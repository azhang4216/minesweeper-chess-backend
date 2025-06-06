const mongoose = require("mongoose");

const verificationTokenSchema = new mongoose.Schema({
  email: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true }, // hashed
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true }
});

module.exports = mongoose.model("VerificationToken", verificationTokenSchema);
