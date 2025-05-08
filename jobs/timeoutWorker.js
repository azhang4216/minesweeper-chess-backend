const { Worker } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis(process.env.REDIS_URL);

const timeoutWorker = new Worker("gameQueue", async (job) => {
    const { gameId, player } = job.data;

    console.log(`Checking timeout for game ${gameId}, player ${player}`);

    // check game state from Redis (via Upstash REST or regular Redis)
    // and emit result via socket if needed (see note below)

    // TODO: add logic to handle timeout detection & messaging
}, {
    connection,
});

module.exports = timeoutWorker;
