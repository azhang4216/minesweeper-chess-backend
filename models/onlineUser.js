/* 
    A logged in player (not necessarily playing a game),
    could be a guest or someone who has an account.
*/

const mongoose = require("mongoose");

const onlineUsersSchema = new mongoose.Schema({
    player_id: { // username if not guest, UUID if guest
        type: String, 
        required: true, 
        unique: true
    }, 
    is_guest: { type: Boolean, required: true },
    room_id: { type: String, required: false }
});

module.exports = mongoose.model("onlineUser", onlineUsersSchema);
