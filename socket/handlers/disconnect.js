const {
    getActivePlayer,
    getRoom,
    deleteRoom,
    removeActivePlayer
} = require("../../redis");

module.exports = (socket, io, redis) => async () => {
    console.log("User disconnected:", socket.id);

    const roomId = await getActivePlayer(redis, socket.id);
    if (!roomId) return;

    const room = await getRoom(redis, roomId);
    if (!room) return;

    room["players"].forEach(async (player) => {
        await removeActivePlayer(redis, player.user_id)
        console.log(`Removed player ${player.user_id}, room ${roomId}, from active players.`);
    });

    // TODO: persistent game recording in DB
    await deleteRoom(redis, roomId);

    io.to(roomId).emit("playerDisconnected", {
        roomId,
        message: `Player ${socket.id} disconnected from game room ${roomId}.`
    });
}