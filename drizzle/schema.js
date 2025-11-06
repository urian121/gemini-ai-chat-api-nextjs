import { pgTable, text, uuid, timestamp, bigserial } from 'drizzle-orm/pg-core';

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const messages = pgTable('messages', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  sender: text('sender').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});
