import * as R from "./chat.repo.js";
import { storage } from "../../config/storage.js";
import { createNotification } from "../../utils/notify.js";

export async function startConversation(userId, otherUserId) {
  if (!otherUserId || otherUserId === userId) {
    const e = new Error("Invalid other_user_id"); e.status = 400; throw e;
  }
  return R.startOrGetConversation(userId, otherUserId);
}

export async function listMyConversations(userId, page, pageSize) {
  return R.listConversations(userId, { page, pageSize });
}

export async function listMessages(userId, conversationId, page, pageSize) {
  const isMember = await R.isParticipant(conversationId, userId);
  if (!isMember) { const e=new Error("Forbidden"); e.status=403; throw e; }
  return R.listMessages(conversationId, { page, pageSize });
}

export async function sendMessage(userId, conversationId, text, file) {
  const isMember = await R.isParticipant(conversationId, userId);
  if (!isMember) { const e=new Error("Forbidden"); e.status=403; throw e; }

  let attachmentPath = null;
  if (file) {
    const saved = await storage.save(file, "messages");
    attachmentPath = saved.path;
  }

  const msg = await R.createMessage(conversationId, userId, (text || "").trim(), attachmentPath);

  // notify others (basic)
  const others = await R.getOtherParticipants(conversationId, userId);
  for (const uid of others) {
    await createNotification(uid, "message_received", "New message", text?.slice(0,100) || "", {
      conversationId, messageId: msg.id
    });
  }
  return msg;
}

export async function markRead(userId, conversationId) {
  const isMember = await R.isParticipant(conversationId, userId);
  if (!isMember) { const e=new Error("Forbidden"); e.status=403; throw e; }
  await R.markRead(conversationId, userId);
}
