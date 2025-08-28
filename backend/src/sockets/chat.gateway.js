import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import * as Chat from "../modules/chat/chat.repo.js";
import { createNotification } from "../utils/notify.js";

export default function setupChatGateway(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token
        || socket.handshake.headers?.authorization?.replace(/^Bearer /, "");
      if (!token) return next(new Error("Unauthorized"));
      const payload = jwt.verify(token, config.jwtSecret);
      socket.data.userId = Number(payload.sub);
      next();
    } catch (e) { next(new Error("Unauthorized")); }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;

    socket.on("chat:join", async ({ conversationId }) => {
      // Ensure user is a participant
      const ok = await Chat.isParticipant(conversationId, userId);
      if (ok) socket.join(`conv:${conversationId}`);
    });

    socket.on("chat:send", async ({ conversationId, body }) => {
      if (!body?.trim()) return;
      const ok = await Chat.isParticipant(conversationId, userId);
      if (!ok) return;

      const msg = await Chat.createMessage(conversationId, userId, body.trim(), null);
      // notify other participants
      const others = await Chat.getOtherParticipants(conversationId, userId);
      for (const uid of others) {
        await createNotification(uid, "message_received", "New message", body.slice(0, 100), {
          conversationId, messageId: msg.id
        });
      }
      io.to(`conv:${conversationId}`).emit("chat:message", { message: msg });
    });

    socket.on("chat:read", async ({ conversationId }) => {
      const ok = await Chat.isParticipant(conversationId, userId);
      if (!ok) return;
      await Chat.markRead(conversationId, userId);
      io.to(`conv:${conversationId}`).emit("chat:read", { userId, conversationId, ts: Date.now() });
    });
  });
}
