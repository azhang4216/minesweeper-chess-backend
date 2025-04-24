const getBothPlayers = async (redis, playersKey) => {
    const playersHash = await redis.hgetall(playersKey);

    // Convert each JSON string back into a JS object
    const players = Object.entries(playersHash).reduce((acc, [socketId, json]) => {
        acc[socketId] = JSON.parse(json);
        return acc;
    }, {});

    return players;
};

module.exports = { getBothPlayers };