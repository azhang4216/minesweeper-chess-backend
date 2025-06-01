const mongoose = require("mongoose");

const activePlayersSchema = new mongoose.Schema({
    id: { type: String, required: true }, // username if not guest, UUID if guest
    isGuest: { type: Boolean, required: true },
    roomId: { type: String, required: false }
});

module.exports = mongoose.model("ActivePlayer", activePlayersSchema);
