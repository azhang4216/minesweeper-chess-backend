// import { CompletedGame } from "../models/index.js";
import { calculateElo } from "../helpers/index.js";

const finishAndRecordGame = async (gameId, loserId, is_draw, reason, activeGames) => {
    // TODO: Implement this function to finish the game and record it in the database
//     const game = await ActiveGame.findOne({ game_id: gameId });
//     if (!game) return;

//     const players = game.players;
//     const loserIndex = players.findIndex(p => p.id === loserId);
//     const winnerIndex = loserIndex === 0 ? 1 : 0;
//     const loser = players[loserIndex];
//     const winner = players[winnerIndex];

//     const loserIsWhite = loser.is_white;
//     const whitePlayer = loserIsWhite ? loser : winner;
//     const blackPlayer = loserIsWhite ? winner : loser;

//     // calculate elo difference
//     const [whiteEloChange, blackEloChange] = calculateElo(
//         whitePlayer.elo,
//         blackPlayer.elo,
//         is_draw ? 0.5 : (loserIsWhite ? 0 : 1) // 0 = white lost, 1 = black lost
//     );

//     // persistent storage and tell player the other disconnected
//     const blackPlayerInfo = {
//         id: blackPlayer.id,
//         is_guest: blackPlayer.is_guest,
//         original_elo: blackPlayer.elo,
//         elo_change: blackEloChange
//     };

//     const whitePlayerInfo = {
//         id: whitePlayer.id,
//         is_guest: whitePlayer.is_guest,
//         original_elo: whitePlayer.elo,
//         elo_change: whiteEloChange
//     };

//     const completedGame = new CompletedGame({
//         game_id: gameId,
//         black_player: blackPlayerInfo,
//         white_player_id: whitePlayerInfo,
//         winner_color: loserIsWhite ? "black won" : "white won",
//         by: reason,
//         game_pgn: game.game_pgn,
//         time_control: game.time_control
//     });

//     await completedGame.save();
//     console.log(`Saved game ${gameId} to completed games`);

//     // delete the activeGame
//     await game.deleteOne();
//     console.log(`Deleted game ${gameId} from active games`);
};

export default finishAndRecordGame;