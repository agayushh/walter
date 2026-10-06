import { defineRelations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";

export const roles = pgEnum("roles", ["user", "assistant", "system"]);
export const messageStatus = pgEnum("message_status", [
  "pending",
  "success",
  "error",
]);

export const fileType = pgEnum("file_type", [
  "pdf",
  "image",
  "video",
  "audio",
  "other",
]);

export const userTable = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  avatar: varchar("avatar"),
});

export const chatsTable = pgTable(
  "chats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, {
        onDelete: "cascade",
      }),
    title: varchar("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("chats_to_user").on(table.userId)],
);

export const messagesTable = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chatsTable.id, {
        onDelete: "cascade",
      }),
    role: roles("role").notNull(),
    content: text("content").notNull(),
    messageStatus: messageStatus("message_status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("messages_to_chats").on(table.chatId)],
);

export const attachmentsTable = pgTable(
  "attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messagesTable.id, {
        onDelete: "cascade",
      }),
    fileName: varchar("file_name").notNull(),
    fileSize: integer().notNull(),
    fileUrl: varchar("file_url").notNull(),
    fileType: fileType("file_type").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("attachments_to_messages").on(table.messageId)],
);

export const memoriesTable = pgTable(
  "memories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("memories_to_user").on(table.userId)],
);

export const documentsTable = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    fileName: varchar("file_name").notNull(),
    content: text("content").notNull(),
    pinned: boolean("pinned").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("documents_to_user").on(table.userId)],
);

export const interviewSessionsTable = pgTable(
  "interview_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    role: varchar("role").notNull(),
    difficulty: varchar("difficulty").notNull(),
    jobDescription: text("job_description"),
    status: varchar("status").notNull().default("active"),
    score: integer("score"),
    feedback: text("feedback"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("interviews_to_user").on(table.userId)],
);

export const interviewTurnsTable = pgTable(
  "interview_turns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => interviewSessionsTable.id, { onDelete: "cascade" }),
    role: varchar("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("interview_turns_to_session").on(table.sessionId)],
);

export const relations = defineRelations(
  {
    userTable,
    chatsTable,
    messagesTable,
    attachmentsTable,
  },
  (r) => ({
    chatsTable: {
      author: r.one.userTable({
        from: r.chatsTable.userId,
        to: r.userTable.id,
      }),
      messages: r.many.messagesTable({
        from: r.chatsTable.id,
        to: r.messagesTable.chatId,
      }),
    },
    userTable: {
      userChats: r.many.chatsTable({
        from: r.userTable.id,
        to: r.chatsTable.userId,
      }),
    },
    messagesTable: {
      chat: r.one.chatsTable({
        from: r.messagesTable.chatId,
        to: r.chatsTable.id,
      }),
      attachments: r.many.attachmentsTable({
        from: r.messagesTable.id,
        to: r.attachmentsTable.messageId,
      }),
    },

    attachmentsTable: {
      message: r.one.messagesTable({
        from: r.attachmentsTable.messageId,
        to: r.messagesTable.id,
      }),
    },
  }),
);
