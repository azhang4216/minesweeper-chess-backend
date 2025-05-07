import { getRoomSummariesByGameState } from "../../redis";

const { GAME_STATES } = require("../gameStates");
// const util = require('util')

module.exports = (redis) => async (callback) => {
    // testing - logging all rooms
    // console.log(util.inspect(rooms, { showHidden: false, depth: null, colors: true }));

    // const matchingRooms = Object.entries(rooms)
    //     .filter(([_, room]) => room.game_state === GAME_STATES.matching)
    //     .map(([roomId, room]) => ({
    //         id: roomId,
    //         elo: room.players[0].elo,
    //         time_control: room.time_control
    //     }));

    // testing - logging filtered rooms to send back to frontend
    // console.log(util.inspect(matchingRooms, { showHidden: false, depth: null, colors: true }));

    const matchingRooms = await getRoomSummariesByGameState(redis, GAME_STATES.matching);

    return callback({
        success: true,
        rooms: matchingRooms
    });
};
