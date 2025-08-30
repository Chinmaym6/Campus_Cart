import http from "http";
import app from "./app.js";
import { config } from "./config/index.js";
import { initSocket } from "./loaders/socket.js";
import { seedDefaults as seedCategories } from "./modules/marketplace/categories/categories.service.js";


const server = http.createServer(app);
initSocket(server); // safe no-op for now

await seedCategories();
console.log("🌱 Categories seeded");
server.listen(config.port, () => {
  console.log(`🚀 API running on http://localhost:${config.port}`);
});
