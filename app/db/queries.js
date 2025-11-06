import { db } from '@/app/db/db.js';
import { conversations, messages } from '@/drizzle/schema.js';
import { sql, eq } from 'drizzle-orm';

export async function createConversation(id) {
  await db.insert(conversations)
    .values({ id })
    .onConflictDoNothing({ target: conversations.id });
}

export async function saveMessage({ conversationId, content, sender, image }) {
  await db.insert(messages).values({
    conversationId,
    content,
    sender,
    image: image ?? null
  });
}

export async function getMessages(conversationId) {
  return db.select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.id);
}

export async function listConversations() {
  const result = await db.execute(sql`
    SELECT c.id, c.created_at,
      (
        SELECT content FROM messages m
        WHERE m.conversation_id = c.id AND m.sender = 'user'
        ORDER BY id ASC LIMIT 1
      ) AS title,
      (
        SELECT COUNT(*)::INT FROM messages m
        WHERE m.conversation_id = c.id
      ) AS message_count
    FROM conversations c
    ORDER BY c.created_at DESC;
  `);
  return result.rows;
}