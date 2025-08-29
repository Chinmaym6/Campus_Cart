import { Server } from "socket.io";

let io = null;
export const initSocket = (httpServer) => {
  io = new Server(httpServer, { cors: { origin: "*" } });
  io.on("connection", (socket) => {
    socket.on("disconnect", () => {});
  });
};

export const getIO = () => io;
