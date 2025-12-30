
import { io } from "socket.io-client";
import { BASE_SOCKET, config } from "./config";

const socket = io(BASE_SOCKET, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
});

export default socket;