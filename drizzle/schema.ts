import { pgTable, serial, varchar, text, timestamp, boolean, pgEnum, integer } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const userSettings = pgTable("userSettings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  tutorModelName: varchar("tutorModelName", { length: 255 }),
  tutorApiKey: text("tutorApiKey"),
  questionGeneratorModelName: varchar("questionGeneratorModelName", { length: 255 }),
  questionGeneratorApiKey: text("questionGeneratorApiKey"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  questionText: text("questionText").notNull(),
  answer: text("answer").notNull(),
  source: varchar("source", { length: 50 }).default("generated").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

export const practiceSessions = pgTable("practiceSessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  category: varchar("category", { length: 100 }),
  difficulty: difficultyEnum("difficulty"),
  totalQuestions: integer("totalQuestions").notNull(),
  correctAnswers: integer("correctAnswers").notNull(),
  score: integer("score").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type PracticeSession = typeof practiceSessions.$inferSelect;
export type InsertPracticeSession = typeof practiceSessions.$inferInsert;

export const questionAttempts = pgTable("questionAttempts", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionId").notNull(),
  questionId: integer("questionId").notNull(),
  userAnswer: text("userAnswer"),
  isCorrect: boolean("isCorrect").notNull(),
  buzzTime: integer("buzzTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuestionAttempt = typeof questionAttempts.$inferSelect;
export type InsertQuestionAttempt = typeof questionAttempts.$inferInsert;

export const chatMessages = pgTable("chatMessages", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

export const studyTopics = pgTable("studyTopics", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 100 }).notNull(),
  topic: varchar("topic", { length: 255 }).notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  description: text("description"),
  resourceLinks: text("resourceLinks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StudyTopic = typeof studyTopics.$inferSelect;
export type InsertStudyTopic = typeof studyTopics.$inferInsert;
