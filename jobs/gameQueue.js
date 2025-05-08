const { Queue } = require("bullmq");
const IORedis = require("ioredis");
const dotenv = require("dotenv");

dotenv.config();

const connection = new IORedis(process.env.UPSTASH_REDIS_URL); // direct Redis URL

const gameQueue = new Queue("gameQueue", {
    connection,
});

module.exports = gameQueue;
