const { 
    getRoom, 
    deleteRoom,
    getActivePlayer,
    removeActivePlayer
} = require("../../redis");

module.exports = (socket, redis) => async ({ roomId }, callback) => {
    console.log(`User ${socket.id} is trying to cancel room ID: ${roomId}.`);

    const roomIdThisPlayerHas = await getActivePlayer(redis, socket.id);
    if (!roomIdThisPlayerHas || roomIdThisPlayerHas !== roomId) {
        // shouldn't happen, but check just in case
        return callback({
            success: false,
            message: "Player cannot cancel a game that is not theirs."
        });
    }

    const room = await getRoom(redis, roomId);
    if (!room) {
        return callback({
            success: false,
            message: "No such game exists."
        });
    }

    room["players"].forEach(async (player) => {
        await removeActivePlayer(redis, player.user_id)
        console.log(`Removed player ${player.user_id}, room ${roomId}, from active players.`);
    });

    await deleteRoom(redis, roomId);

    return callback({
        success: true,
        message: "Successfully cancelled game."
    });
};
