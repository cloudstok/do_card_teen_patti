import type { Namespace, Socket } from "socket.io";
import { betHandler, randomPositionPicker } from "../services/game";

export const gameRoutes = async (io: Namespace, socket: Socket) => {
    console.log("socket connected with id", socket.id);

    socket.on("message", async (data: string) => {
        const [event, bets] = data.split("-");

        switch (event) {
            case "BT":
                await betHandler(socket, io, bets);
                break;
            case "RD":
                await randomPositionPicker(socket, io);
                break;
            default:
                socket.emit("betError", "invalid event");
                break;
        }
    })
    socket.on("disconnect", () => {
        console.log("socket disconnected with id", socket.id);
    });
    socket.on("error", () => {
        console.error("socket error occured", socket.id);
    });

}