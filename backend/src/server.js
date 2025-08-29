import http from "http";
import app from "./app.js";
import { config } from "./config/index.js";
import { initSocket } from "./loaders/socket.js";

const server = http.createServer(app);
initSocket(server); // safe no-op for now

server.listen(config.port, () => {
  console.log(`🚀 API running on http://localhost:${config.port}`);
});
