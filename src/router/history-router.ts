import express from 'express';
import { settlement } from '../db/tables';
import { read } from '../utilities/db-connection';


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

apiRouter.get("/match-history", async (req: any, res: any) => {
    try {
        const { user_id, operator_id, match_id } = req.query;
        if (!user_id || !operator_id || !match_id) throw new Error("user_id, match_id and operator_id are required")
        const history = await getmatchhistory({ user_id, operator_id, match_id });
        return res.status(200).send({ statusCode: 200, history, message: "match history fetched successfully" })
    } catch (error: any) {
        console.error("error occured", error.message);
        return res.status(500).send({ statusCode: 500, error: error.message, message: "unable to fetch match history" })
    }
});


export const getHistory = async ({ user_id, operator_id, limit = 10 }: { user_id: string, operator_id: string, limit?: number }) => {
    try {
        const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 10;

        const rows = await read(`
            SELECT 
              userBets,
              lobby_id
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
                for (const bet of userBets) {
                    const stake = parseFloat(bet.betAmount);
                    const win = parseFloat(bet.winAmount);
                    const odds = parseFloat(bet.mult);

                    result.push({
                        stake,
                        odds,
                        'p/l': win > 0 ? win : -stake,
                        beton: bet.chip,
                        round_id: row.lobby_id
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


export const getmatchhistory = async ({ user_id, operator_id, match_id }: { user_id: string, operator_id: string, match_id: string }) => {
    try {
        const data = await read(`
             SELECT 
            *
                 FROM 
                settlement
            WHERE 
                user_id = ? AND operator_id = ? AND lobby_id = ?
        `, [user_id, operator_id, match_id]);

        return data;

    } catch (error) {
        console.error(`Err while getting getmatchhistory data from table is:::`, error);
        return { error };

    };
}
