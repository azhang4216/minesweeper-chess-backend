function randomlyFillBombs(room) {
    if (!room || !room.players) return;

    room.players.forEach(player => {
        const needed = 3 - player.bombs.length;
        if (needed <= 0) return [null, null];

        const possibleSquares = [];

        const ranks = player.is_white ? ['3', '4'] : ['5', '6'];
        const files = ['a','b','c','d','e','f','g','h'];

        for (const file of files) {
            for (const rank of ranks) {
                const square = file + rank;
                if (!player.bombs.includes(square)) {
                    possibleSquares.push(square);
                }
            }
        }

        // Shuffle the possible squares
        for (let i = possibleSquares.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [possibleSquares[i], possibleSquares[j]] = [possibleSquares[j], possibleSquares[i]];
        }

        // Add the first `needed` squares
        player.bombs.push(...possibleSquares.slice(0, needed));
    });

    // return [white player's bombs, black player's bombs]
    return room.players[0].is_white ? [room.players[0].bombs, room.players[1].bombs] : [room.players[1].bombs, room.players[0].bombs];
};

export default randomlyFillBombs;