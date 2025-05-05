import express from 'express';
import { read } from '../utilities/db-connection';
import { Server, Socket } from 'socket.io';

export const apiRouter = express.Router();

apiRouter.get("/bet-history", async (req: any, res: any) => {
    try {
        let { user_id, operator_id, limit } = req.query;
        if (!user_id || !operator_id) throw new Error("user_id and operator_id are required")
        if (limit) limit = Number(limit);
        const history = await getHistory({ user_id, operator_id, limit });
        return res.status(200).send({ statusCode: 200, history, message: "bets history fetched successfully" })
    } catch (error: any) {
        console.error("error occured", error.message);
        return res.status(500).send({ statusCode: 500, error: error.message, message: "unable to fetch bets history" })
    }
});

export const getHistory = async ({ user_id, operator_id, limit = 10 }: { user_id: string, operator_id: string, limit?: number }) => {
    try {
        const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 10;

        const rows = await read(`
            SELECT 
              userBets,
              lobby_id,
              result
            FROM 
                settlement
            WHERE 
                user_id = ? AND operator_id = ?
            ORDER BY created_at DESC
            LIMIT ${safeLimit}
        `, [user_id, operator_id]);

        const result: any[] = [];

        for (const row of rows) {
            try {
                const userBets = JSON.parse(row.userBets || "[]");

                const gameResult = JSON.parse(row.result || "{}");

                const winner = gameResult.winner;
                const winnerCards = gameResult[winner?.toString()] || [];
                for (const bet of userBets) {
                    const stake = parseFloat(bet.betAmount);
                    const win = parseFloat(bet.winAmount);
                    const odds = parseFloat(bet.mult);


                    result.push({
                        stake,
                        odds,
                        'p/l': win > 0 ? win : -stake,
                        beton: bet.chip,
                        round_id: row.lobby_id,
                        winnerCards
                    });
                }
            } catch (e) {
                console.warn('Failed to parse userBets:', e);
            }
        }

        return result;

    } catch (err) {
        console.error(`Err while getting data from table is:::`, err);
        return { err };
    }
};


// export const getmatchhistory = async ({ user_id, operator_id }: { user_id: string, operator_id: string }) => {
//     try {
//         const rows = await read(`
//              SELECT 
//             result
//                  FROM 
//                 settlement
//             WHERE 
//                 user_id = ? AND operator_id = ? 
//             limit 3    
//         `, [user_id, operator_id]);

//         const winners = rows.map(row => {
//             const parsed = JSON.parse(row.result);
//             return parsed.winner;
//         });
//         return winners;

//     } catch (error) {
//         console.error(`Err while getting getmatchhistory data from table is:::`, error);
//         return { error };

//     };
// }

export const getMatchHistory = async (socket: Socket) => {
    try {
        const historyData = await read(`SELECT lobby_id, result, created_at FROM lobbies ORDER BY created_at DESC LIMIT 3`);
        return socket.emit('historyData', historyData);
    } catch (err) {
        console.error(`Err while getting user history data is:::`, err);
        return;
    }
}