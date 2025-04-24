const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const registerGameHandlers = require("./socket/registerGameHandlers");
const { Redis } = require("@upstash/redis");
const dotenv = require("dotenv");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" },
});

dotenv.config();

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    registerGameHandlers(socket, io, redis);
});

module.exports = { server };
