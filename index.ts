import express from "express";
import { Server } from "socket.io";
import type { Socket } from "socket.io";
import { createServer } from "http";
import cors from "cors";

import { checkAuth } from "./middlewares/socketAuth";
import { createTables } from "./db/index";
import { connect } from "./utilities/amqp";
import { createLogger } from "./utilities/logger";
import { gameRoutes } from "./routes/game";

connect();
createTables();

export const logger = createLogger("Server");
const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: "*" }));

const kenoIo = new Server(httpServer, { cors: { origin: "*" } }).of("/")
    .use((socket: Socket, next: Function) => checkAuth(socket, next))
    .on("connection", (socket: Socket) => gameRoutes(kenoIo, socket))

app.get("/", (req: any, res: any) => {
    return res.status(200).send({
        statusCode: 200,
        message: "🌚 do card teen patti is up and running 🌚",
    });
});

httpServer.listen(process.env.PORT, () => {
    logger.info(`Server running on port: ${process.env.PORT}`);
});
