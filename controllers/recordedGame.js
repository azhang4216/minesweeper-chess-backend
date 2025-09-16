import { RESPONSE_CODES } from '../constants/index.js';
import { RecordedGame } from '../models/index.js';
import { userController } from './index.js';

/**
 * @description creates a new recorded game, updates both players' ELO and past_games
 * @param {Object} gameData required fields for the game and player subdocs
 */
export const createRecordedGame = async (gameData) => {
    try {
        const {
            white_player_id,
            white_elo_before_game_start,
            white_elo_change,
            white_is_guest,

            black_player_id,
            black_elo_before_game_start,
            black_elo_change,
            black_is_guest,

            result,
            result_by,
            bombs,
            game_pgn,
            time_control,
        } = gameData;

        console.log('Creating recorded game with data:', gameData);

        if (
            !white_player_id || !black_player_id || !result || !result_by ||
            !bombs || !game_pgn || !time_control
        ) {
            return RESPONSE_CODES.BAD_REQUEST;
        }

        const white_player = {
            player_id: white_player_id,
            elo_before_game_start: white_elo_before_game_start,
            elo_change: white_elo_change,
            is_guest: white_is_guest,
        };

        const black_player = {
            player_id: black_player_id,
            elo_before_game_start: black_elo_before_game_start,
            elo_change: black_elo_change,
            is_guest: black_is_guest,
        };

        const newGame = new RecordedGame({
            white_player,
            black_player,
            result,
            result_by,
            bombs,
            game_pgn,
            time_control,
        });

        await newGame.save();

        // Only update ELO and past_games if not guests
        const updates = [];

        if (!white_is_guest) {
            updates.push(userController.updateUserElo(white_player_id, white_elo_change));
            updates.push(userController.addPastGame(white_player_id, newGame._id));
        }

        if (!black_is_guest) {
            updates.push(userController.updateUserElo(black_player_id, black_elo_change));
            updates.push(userController.addPastGame(black_player_id, newGame._id));
        }

        await Promise.all(updates);

        return {
            ...RESPONSE_CODES.SUCCESS,
            gameId: newGame._id,
        };
    } catch (error) {
        console.log('Error in createRecordedGame:', error);
        return RESPONSE_CODES.INTERNAL_ERROR;
    }
};

/**
 * @description retrieves a recorded game by ID
 * @param {String} gameId
 */
export const getRecordedGameById = async (gameId) => {
    try {
        const game = await RecordedGame.findById(gameId);
        if (!game) return RESPONSE_CODES.NOT_FOUND;

        return {
            ...RESPONSE_CODES.SUCCESS,
            game,
        };
    } catch (error) {
        console.log('Error in getRecordedGameById:', error);
        return RESPONSE_CODES.INTERNAL_ERROR;
    }
};

/**
 * @description deletes a recorded game by ID
 * @param {String} gameId
 */
export const deleteRecordedGame = async (gameId) => {
    try {
        const game = await RecordedGame.findByIdAndDelete(gameId);
        if (!game) return RESPONSE_CODES.NOT_FOUND;

        return {
            ...RESPONSE_CODES.SUCCESS,
            message: 'Recorded game deleted.',
        };
    } catch (error) {
        console.log('Error in deleteRecordedGame:', error);
        return RESPONSE_CODES.INTERNAL_ERROR;
    }
};
