const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
// const { Redis } = require("@upstash/redis");    // for normal redis commands
// const IORedis = require("ioredis");             // for pub sub
const dotenv = require("dotenv");
const { mongoose } = require("mongoose");

const registerGameHandlers = require("./socket/registerGameHandlers");
// const handleRedisExpiration = require("./redis/redisExpirationHandler");

dotenv.config();

// DB Setup
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost/pb-dev';

// connect mongoose and mongodb
mongoose
    .connect(mongoURI)
    .then(() => {
        console.log('mongoose connected to database');

        global.connection = mongoose.connection;
        console.log('mongo client connected with mongoose');
    })
    .catch((err) => {
        console.log('error: mongoose could not connect to db:', err);
    });

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" },
});

// for now, we use redis just for timeout detection (redis key expiry)
// my redis already has expiration notifications enabled (Ex flag: E = Keyevent, x = expired events)
// note: this redis REST client is for setting and reading keys (game logic)
// const redis = new Redis({
//     url: process.env.UPSTASH_REDIS_REST_URL,
//     token: process.env.UPSTASH_REDIS_REST_TOKEN
// });

// // note: this io redis is for subscribing to key expiration events
// const redisSubscriber = new IORedis(process.env.UPSTASH_REDIS_URL, {
//     tls: {}  // required for Upstash TLS connection
// });

// TODO: migrate these to a redis hset
/* 
    room_id: {
        id: room_id,
        players: [
            {
                id: string,
                is_white: boolean,
                bombs: [],
                elo: int,
                seconds_left: int     // note: this is updated from end of their move, so does not reflect CURRENT seconds left
            },
            {
                id: string,
                is_white: boolean,
                bombs: [],
                elo: int,
                timer: countDownTimer
            }
        ]
        game: Chess object,
        game_state: "MATCHING", "PLACING_BOMBS", "PLAYING",
        time_control: int (number of seconds)
    }
*/
const rooms = {};

// key: socket id, val: room id assigned
const activePlayers = {};    // includes people playing and people in the queue

// 🔔 Subscribe to key expiration events
// redisSubscriber.psubscribe("__keyevent@0__:expired", (err, _count) => {
//     if (err) console.error("Subscription error:", err);
// });

// redisSubscriber.on("pmessage", handleRedisExpiration(io, redis, games, activePlayers));

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    registerGameHandlers(socket, io, rooms, activePlayers);
});

module.exports = { server };
