// Set entire room object
export async function setRoom(redis, roomId, roomData) {
    // Stringify complex objects
    const data = {};
    for (const [key, value] of Object.entries(roomData)) {
        data[key] = typeof value === 'object' ? JSON.stringify(value) : value;
    }
    return await redis.hset(`rooms:${roomId}`, data);
}

// Get entire room object
export async function getRoom(redis, roomId) {
    const data = await redis.hgetall(`rooms:${roomId}`);
    if (!data) return null;

    // Parse JSON fields back
    for (const key in data) {
        try {
            data[key] = JSON.parse(data[key]);
        } catch (e) {
            // not JSON, leave as-is
        }
    }
    return data;
}

// Update or set a single field in the room
export async function updateRoomField(redis, roomId, field, value) {
    const val = typeof value === 'object' ? JSON.stringify(value) : value;
    return await redis.hset(`rooms:${roomId}`, { [field]: val });
}

// Delete a room
export async function deleteRoom(redis, roomId) {
    return await redis.del(`rooms:${roomId}`);
}

export async function roomExists(redis, roomId) {
    const exists = await redis.exists(`rooms:${roomId}`);
    return exists === 1;
}

export async function addPlayerToRoom(redis, room, newPlayer) {
    const players = room.players || [];

    newPlayer.is_white = players.length === 0 ? true : !players[0].is_white;
    newPlayer.bombs = newPlayer.bombs || [];
    newPlayer.elo = newPlayer.elo || 1500;

    players.push(newPlayer);

    await updateRoomField(redis, roomId, 'players', players);
    return players;
}

export async function getRoomField(redis, roomId, field) {
    const val = await redis.hget(`rooms:${roomId}`, field);
    try {
        return JSON.parse(val); // in case it’s a JSON string (like objects or arrays)
    } catch {
        return val; // return as-is if it’s a plain string or number
    }
}

export async function addBombToPlayer(redis, roomId, playerId, square) {
    const room = await getRoom(redis, roomId);
    if (!room) {
        throw new Error(`Room ${roomId} does not exist`);
    }

    const player = room.players.find(p => p.user_id === playerId);
    if (!player) {
        throw new Error(`Player ${playerId} not found in room ${roomId}`);
    }

    if (!player.bombs) {
        player.bombs = [];
    }

    player.bombs.push(square);

    await updateRoomField(redis, roomId, 'players', room.players);
    return player.bombs;
}

export async function haveAllBombsBeenPlaced(redis, roomId) {
    const room = await getRoom(redis, roomId);
    if (!room) {
        throw new Error(`Room ${roomId} does not exist`);
    }

    const totalBombs = room.players.reduce((sum, player) => {
        return sum + (player.bombs?.length || 0);
    }, 0);

    return totalBombs === 6;
}

export async function getRoomSummariesByGameState(redis, targetState) {
    const keys = await redis.keys('rooms:*');
    const results = [];

    for (const key of keys) {
        const roomId = key.split(':')[1];
        const roomData = await redis.hgetall(key);

        if (roomData.game_state === targetState) {
            // Parse JSON-encoded fields
            const players = JSON.parse(roomData.players || '[]');
            const time_control = parseInt(roomData.time_control, 10);

            results.push({
                id: roomId,
                elo: players[0]?.elo || null,
                time_control,
            });
        }
    }

    return results;
}



