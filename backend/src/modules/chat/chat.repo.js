import { db } from "../../loaders/database.js";

// Ensure participant
export async function isParticipant(conversationId, userId) {
  const { rows } = await db.query(
    `SELECT 1 FROM campus_cart.conversation_participants
     WHERE conversation_id=$1 AND user_id=$2`,
    [conversationId, userId]
  );
  return !!rows[0];
}
export async function getOtherParticipants(conversationId, userId) {
  const { rows } = await db.query(
    `SELECT user_id FROM campus_cart.conversation_participants
     WHERE conversation_id=$1 AND user_id<>$2`,
    [conversationId, userId]
  );
  return rows.map(r => r.user_id);
}

// Start or return existing 1:1 conversation (canonical ordering)
export async function startOrGetConversation(a, b) {
  // Try to find an existing 1:1 convo (two participants)
  const { rows: found } = await db.query(
    `SELECT cp1.conversation_id AS id
       FROM campus_cart.conversation_participants cp1
       JOIN campus_cart.conversation_participants cp2
         ON cp2.conversation_id = cp1.conversation_id
      WHERE cp1.user_id=$1 AND cp2.user_id=$2
      GROUP BY cp1.conversation_id
      HAVING COUNT(*)=2
      LIMIT 1`,
    [a, b]
  );
  if (found[0]) return { id: found[0].id };

  // Create new conversation
  const { rows: conv } = await db.query(
    `INSERT INTO campus_cart.conversations DEFAULT VALUES RETURNING id, created_at`,
    []
  );
  const convId = conv[0].id;
  await db.query(
    `INSERT INTO campus_cart.conversation_participants (conversation_id, user_id)
     VALUES ($1,$2),($1,$3)`,
    [convId, a, b]
  );
  return { id: convId, created_at: conv[0].created_at };
}

export async function listConversations(userId, { page, pageSize }) {
  const offset = (page - 1) * pageSize;

  const base = `
    SELECT c.id,
           c.created_at,
           -- last message
           (SELECT m.body FROM campus_cart.messages m
             WHERE m.conversation_id = c.id
             ORDER BY m.created_at DESC LIMIT 1) AS last_message,
           (SELECT m.created_at FROM campus_cart.messages m
             WHERE m.conversation_id = c.id
             ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
           -- unread count
           GREATEST(
             (SELECT COUNT(*) FROM campus_cart.messages m
               JOIN campus_cart.conversation_participants p ON p.conversation_id = m.conversation_id
              WHERE m.conversation_id = c.id
                AND p.user_id = $1
                AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at)
                AND m.sender_id <> $1
             ), 0
           )::int AS unread_count
    FROM campus_cart.conversations c
    JOIN campus_cart.conversation_participants cp ON cp.conversation_id = c.id
    WHERE cp.user_id = $1
  `;
  const countSql = `SELECT COUNT(*)::int AS total FROM (${base}) q`;
  const dataSql = `${base} ORDER BY COALESCE(last_message_at, c.created_at) DESC LIMIT $2 OFFSET $3`;

  const [{ rows: [{ total }] }, { rows }] = await Promise.all([
    db.query(countSql, [userId]),
    db.query(dataSql, [userId, pageSize, offset])
  ]);

  return { conversations: rows, page, pageSize, total };
}

export async function listMessages(conversationId, { page, pageSize }) {
  const offset = (page - 1) * pageSize;
  const { rows } = await db.query(
    `SELECT id, sender_id, body, attachment_path, created_at, edited_at
     FROM campus_cart.messages
     WHERE conversation_id=$1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [conversationId, pageSize, offset]
  );
  return { messages: rows.reverse(), page, pageSize };
}

export async function createMessage(conversationId, senderId, body, attachmentPath) {
  const { rows } = await db.query(
    `INSERT INTO campus_cart.messages
       (conversation_id, sender_id, body, attachment_path)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [conversationId, senderId, body || null, attachmentPath || null]
  );
  return rows[0];
}

export async function markRead(conversationId, userId) {
  await db.query(
    `UPDATE campus_cart.conversation_participants
     SET last_read_at = now()
     WHERE conversation_id=$1 AND user_id=$2`,
    [conversationId, userId]
  );
}
