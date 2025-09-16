import { createRecordedGame } from "../controllers/recordedGame.js";
import { updateUserElo, addPastGame } from "../controllers/user.js";

export const finishAndRecordGame = async (
    game_id,
    games,
    activePlayers,
    white_elo_change,
    black_elo_change,
    result_by,
    result
) => {
    // verify valid input params
    const game = games[game_id];
    if (!game) {
        console.error(`Invalid game_id for finishAndRecordGame: ${game_id}`);
        return;
    }
    if (!["WHITE_WINS", "BLACK_WINS", "DRAW"].includes(result)) {
        console.error(`Invalid result: ${result}`);
        return;
    }

    // get metadata
    const white_player = game.players.find(p => p.is_white);
    const black_player = game.players.find(p => !p.is_white);
    if (!white_player || !black_player) {
        console.error(`Could not find both players in game ${game_id}`);
        return;
    }

    try {
        const response = await createRecordedGame({
            white_player_id: white_player.user_id,
            white_elo_before_game_start: white_player.elo,
            white_elo_change,
            white_is_guest: activePlayers[white_player.user_id]?.is_guest || true,

            black_player_id: black_player.user_id,
            black_elo_before_game_start: black_player.elo,
            black_elo_change,
            black_is_guest: activePlayers[black_player.user_id]?.is_guest || true,

            result,
            result_by,
            bombs: [...(white_player.bombs || []), ...(black_player.bombs || [])],
            game_pgn: game.game.pgn(),
            time_control: game.time_control,
        });

        if (response.type == "SUCCESS") {
            console.log(`Recorded finished game ${game_id} to database`);
            // add a past game reference to each user
            try {
                await addPastGame(white_player.user_id, response.gameId);
                await addPastGame(black_player.user_id, response.gameId);
            } catch (err) {
                console.error("Error adding past game reference:", err);
            }
        } else {
            console.error("Error recording saving game to DB:", response);
        }
    } catch (error) {
        console.error("Error recording finished game:", error);
    }

    // now, we have to associate the elo changes
    // with the users (if they are not guests)
    try {
        if (!white_is_guest) {
            await updateUserElo(white_player.user_id, white_player.elo + white_elo_change);
        }
        if (!black_is_guest) {
            await updateUserElo(black_player.user_id, black_player.elo + black_elo_change);
        }
    } catch (err) {
        console.error("Error updating user elo:", err);
    }

    // clean up in-memory tracking
    delete games[game_id];
    delete activePlayers[white_player.id];
    delete activePlayers[black_player.id];
    
    // const game = await ActiveGame.findOne({ game_id: gameId });
    // if (!game) return;

    // const players = game.players;
    // const loserIndex = players.findIndex(p => p.id === loserId);
    // const winnerIndex = loserIndex === 0 ? 1 : 0;
    // const loser = players[loserIndex];
    // const winner = players[winnerIndex];

    // const loserIsWhite = loser.is_white;
    // const whitePlayer = loserIsWhite ? loser : winner;
    // const blackPlayer = loserIsWhite ? winner : loser;

    // // calculate elo difference
    // const [whiteEloChange, blackEloChange] = calculateElo(
    //     whitePlayer.elo,
    //     blackPlayer.elo,
    //     is_draw ? 0.5 : (loserIsWhite ? 0 : 1) // 0 = white lost, 1 = black lost
    // );

    // // persistent storage and tell player the other disconnected
    // const blackPlayerInfo = {
    //     id: blackPlayer.id,
    //     is_guest: blackPlayer.is_guest,
    //     original_elo: blackPlayer.elo,
    //     elo_change: blackEloChange
    // };

    // const whitePlayerInfo = {
    //     id: whitePlayer.id,
    //     is_guest: whitePlayer.is_guest,
    //     original_elo: whitePlayer.elo,
    //     elo_change: whiteEloChange
    // };

    // const completedGame = new CompletedGame({
    //     game_id: gameId,
    //     black_player: blackPlayerInfo,
    //     white_player_id: whitePlayerInfo,
    //     winner_color: loserIsWhite ? "black won" : "white won",
    //     by: reason,
    //     game_pgn: game.game_pgn,
    //     time_control: game.time_control
    // });

    // await completedGame.save();
    // console.log(`Saved game ${gameId} to completed games`);

    // // delete the activeGame
    // await game.deleteOne();
    // console.log(`Deleted game ${gameId} from active games`);
};

export default finishAndRecordGame;