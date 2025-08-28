import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { config } from "./config/index.js";
import setupChatGateway from "./sockets/chat.gateway.js";
import { startJobs } from "./loaders/jobs.js";
import { verifyMailer } from "./utils/mailer.js";

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: config.corsOrigin, credentials: true } });

setupChatGateway(io);
startJobs();

setupChatGateway(io);
startJobs();
verifyMailer();

server.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
