const LOCK_DURATION_MS = 500; // to prevent super quick double-clicking bombs

// Set entire room object
async function setRoom(redis, roomId, roomData) {
    // Stringify complex objects (arrays, objects)
    const data = {};
    for (const [key, value] of Object.entries(roomData)) {
        if (value && typeof value === 'object') {
            console.log(`Stringifying key: ${key}`, value);
            data[key] = JSON.stringify(value);
        } else {
            data[key] = value;
        }
    }
    console.log('Setting room data:', data);
    return await redis.hset(`rooms:${roomId}`, data);
}

// Get entire room object
async function getRoom(redis, roomId) {
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
async function updateRoomField(redis, roomId, field, value) {
    const val = typeof value === 'object' ? JSON.stringify(value) : value;
    return await redis.hset(`rooms:${roomId}`, { [field]: val });
}

// Delete a room
async function deleteRoom(redis, roomId) {
    return await redis.del(`rooms:${roomId}`);
}

async function roomExists(redis, roomId) {
    const exists = await redis.exists(`rooms:${roomId}`);
    return exists === 1;
}

async function addPlayerToRoom(redis, roomId, newPlayer) {
    const room = await getRoom(redis, roomId);
    if (!room) {
        throw new Error(`Room ${roomId} does not exist`);
    }

    const players = room.players || [];

    newPlayer.is_white = players.length === 0 ? true : !players[0].is_white;
    newPlayer.bombs = newPlayer.bombs || [];
    newPlayer.elo = newPlayer.elo || 1500;

    players.push(newPlayer);

    await updateRoomField(redis, roomId, 'players', players);
    return players;
}

async function getRoomField(redis, roomId, field) {
    const val = await redis.hget(`rooms:${roomId}`, field);
    try {
        return JSON.parse(val); // in case it’s a JSON string (like objects or arrays)
    } catch {
        return val; // return as-is if it’s a plain string or number
    }
}

async function addBombToPlayer(redis, roomData, playerId, square) {
    const player = roomData.players.find(p => p.user_id === playerId);
    if (!player) throw new Error(`Player ${playerId} not in room`);

    player.bombs = player.bombs || [];
    player.bombs.push(square);

    await updateRoomField(redis, roomData.id, 'players', roomData.players);
}

async function haveAllBombsBeenPlaced(redis, roomId) {
    const room = await getRoom(redis, roomId);
    if (!room) {
        throw new Error(`Room ${roomId} does not exist`);
    }

    const totalBombs = room.players.reduce((sum, player) => {
        return sum + (player.bombs?.length || 0);
    }, 0);

    return totalBombs === 6;
}

async function getRoomSummariesByGameState(redis, targetState) {
    const keys = await redis.keys('rooms:*');

    const results = [];

    for (const key of keys) {
        const roomId = key.split(':')[1];
        const roomData = await redis.hgetall(key);
        console.log(key, roomId);
        console.log(roomData);

        if (roomData.game_state === targetState) {
            // Ensure players is a string before parsing
            let players = roomData.players;
            if (typeof players === 'string') {
                players = JSON.parse(players || '[]');
            }

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

async function tryLockPlayer(redis, playerId) {
    const lockKey = `lock:${playerId}`;
    // TTL in milliseconds
    const ttl = LOCK_DURATION_MS;

    const result = await redis.set(lockKey, "locked", {
        nx: true,
        px: ttl
    });

    return result === "OK";
}

module.exports = {
    setRoom,
    getRoom,
    updateRoomField,
    deleteRoom,
    roomExists,
    addPlayerToRoom,
    getRoomField,
    addBombToPlayer,
    haveAllBombsBeenPlaced,
    getRoomSummariesByGameState,
    tryLockPlayer
};



