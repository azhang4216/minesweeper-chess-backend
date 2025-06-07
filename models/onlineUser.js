/* 
    A logged in player (not necessarily playing a game),
    could be a guest or someone who has an account.
*/

const mongoose = require("mongoose");

const onlineUsersSchema = new mongoose.Schema({
    playerId: { type: String, required: true }, // username if not guest, UUID if guest
    isGuest: { type: Boolean, required: true },
    roomId: { type: String, required: false }
});

module.exports = mongoose.model("onlineUser", onlineUsersSchema);
