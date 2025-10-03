const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  refreshTokenId: { type: String, default: null }
});

module.exports = mongoose.model("UsersInfo", UserSchema);
