import type { Namespace, Socket } from "socket.io";
import { GAME_SETTINGS } from "../constant";

export async function betHandler(socket: Socket, io: Namespace, bet: any) {
    try {
        console.log("BET HANDLER RUNNING");
    } catch (error: any) {
        console.error("error occured in betHandler", error.message);
    }
}
export async function randomPositionPicker(socket: Socket, io: Namespace) {
    try {
        const arr = Array.from({ length: 10 }, () => Math.floor(Math.random() * 36));
        console.log(arr);
        socket.emit("message", { event: "random_postions", arr });
        return;
    } catch (error: any) {
        console.error("error occured in randomPositionPicker", error.message);
    }
}
export function fetchMultipliers(socket: Socket, num: number) {
    try {
        if (!num) return socket.emit("betError", "number not sent");
        const multArr = GAME_SETTINGS.multipliers[num];
        socket.emit("message", { event: "mults", multipliers: multArr });
        return;
    } catch (error: any) {
        console.error("error occured in randomPositionPicker", error.message);
    }
}