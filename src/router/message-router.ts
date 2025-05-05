
import { Server, Socket } from "socket.io";
import { placeBet } from "../module/bets/bets-session";
import { createLogger } from '../utilities/logger';
import { getPrevRoundResults } from "../module/lobbies/lobbies-result";
// import { getPrevRoundResults } from "../module/lobbies/lobby-event";

const logger = createLogger('Event');

export const messageRouter = async (io: Server, socket: Socket): Promise<void> => {
    // io.emit('lastRounds', getPrevRoundResults());
    socket.on('message', (data: string) => {
        logger.info(data);
        const event = data.split(':');
        if (event[0] == 'BT') return placeBet(socket, [event[1], event[2]]);
    });
};