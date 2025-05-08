const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Redis } = require("@upstash/redis");
const { Queue, Worker, QueueScheduler } = require("bullmq");
const IORedis = require("ioredis");
const dotenv = require("dotenv");
const registerGameHandlers = require("./socket/registerGameHandlers");

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" },
});

/* 
    room_id: {
        id: room_id,
        players: [
            {
                id: string,
                is_white: boolean,
                bombs: [],
                elo: int,
                last_move_time: datetime // as ISO 8601, using .toISOString(), can decode with new Date(iso string here) 
            },
            {
                id: string,
                is_white: boolean,
                bombs: [],
                elo: int,
                time_left: int (ms)
            }
        ]
        game: Chess object,
        game_state: "MATCHING", "PLACING_BOMBS", "PLAYING",
        time_control: int (number of seconds)
    }
*/

// note: this redis REST client is for setting and reading keys (game logic)
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
});

// we also create a background bullmq queue for checking player timeouts
const connection = new IORedis(process.env.UPSTASH_REDIS_URL, {
    maxRetriesPerRequest: null,                                        // bullMQ should not automatically retry Redis requests
});

const timeoutQueue = new Queue("timeout-queue", { connection });       // add timeout jobs
// const scheduler = new QueueScheduler("timeout-queue", { connection }); // not called directly, but for delayed jobs

const timeoutWorker = new Worker("timeout-queue", async (job) => {     // executes jobs as they become due
    const {
        roomId,
        playerId
    } = job.data;

    if (job.name === "bomb-timeout") {
        // [whitePlayerBombs, blackPlayerBombs] = randomlyFillBombs(room);
        // io.to(roomId).emit("startPlay", { whitePlayerBombs, blackPlayerBombs });
        // room.game_state = GAME_STATES.playing;
        console.log(`[BOMB TIMEOUT] ${playerId} timed out in room ${roomId}.`);
    } else if (job.name === "player-timeout") {
        console.log(`[PLAYER TIMEOUT] ${playerId} timed out in room ${roomId}.`);
    } else {
        console.log(`unknown timeout type: ${job.name}`);
    }

    // console.log(`Timeout job ran: ${playerColor} timed out in game ${roomId}`);

    // // Emit to both players in the game room
    // io.to(roomId).emit("playerTimeout", { playerColor });
}, { connection });

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    registerGameHandlers(socket, io, redis, timeoutQueue);
});

module.exports = { server };
