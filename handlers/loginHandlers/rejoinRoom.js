const rejoinRoom = (socket, activePlayerRooms, disconnectTimers) => (playerId) => {
    try {
        // set playerId on socket data
        socket.data.playerId = playerId;

        // cancel disconnect timeout
        if (disconnectTimers[playerId]) {
            clearTimeout(disconnectTimers[playerId]);
            delete disconnectTimers[playerId];
            console.log(`Player ${playerId} rejoined in time`);
        }

        const roomId = activePlayerRooms[playerId];
        if (roomId) {
            socket.join(roomId);
            socket.emit("rejoined", { roomId });
            socket.to(roomId).emit("playerRejoined", { playerId });
        }
    } catch (err) {
        console.error(err);
        socket.emit("error", "Rejoin failed");
    }
};

export default rejoinRoom;