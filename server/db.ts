import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { 
  InsertUser, 
  users, 
  userSettings, 
  InsertUserSettings,
  questions,
  InsertQuestion,
  practiceSessions,
  InsertPracticeSession,
  questionAttempts,
  InsertQuestionAttempt,
  chatMessages,
  InsertChatMessage,
  studyTopics,
  InsertStudyTopic,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL);
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // PostgreSQL upsert syntax
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// User Settings
export async function getUserSettings(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertUserSettings(settings: InsertUserSettings) {
  const db = await getDb();
  if (!db) return;

  // PostgreSQL upsert - check if exists first
  const existing = await db.select().from(userSettings).where(eq(userSettings.userId, settings.userId!)).limit(1);
  
  if (existing.length > 0) {
    await db.update(userSettings).set({
      tutorModelName: settings.tutorModelName,
      tutorApiKey: settings.tutorApiKey,
      questionGeneratorModelName: settings.questionGeneratorModelName,
      questionGeneratorApiKey: settings.questionGeneratorApiKey,
      updatedAt: new Date(),
    }).where(eq(userSettings.userId, settings.userId!));
  } else {
    await db.insert(userSettings).values(settings);
  }
}

// Questions
export async function createQuestion(question: InsertQuestion) {
  const db = await getDb();
  if (!db) return;

  const result = await db.insert(questions).values(question);
  return result;
}

export async function getQuestionsByCategory(userId: number, category: string, difficulty?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(questions.userId, userId), eq(questions.category, category)];
  if (difficulty) {
    conditions.push(eq(questions.difficulty, difficulty as any));
  }

  return await db.select().from(questions).where(and(...conditions)).orderBy(desc(questions.createdAt));
}

export async function getRandomQuestions(userId: number, category?: string, difficulty?: string, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(questions.userId, userId)];
  if (category) {
    conditions.push(eq(questions.category, category));
  }
  if (difficulty) {
    conditions.push(eq(questions.difficulty, difficulty as any));
  }

  // PostgreSQL random function
  return await db.select().from(questions).where(and(...conditions)).orderBy(sql`RANDOM()`).limit(limit);
}

// Practice Sessions
export async function createPracticeSession(session: InsertPracticeSession) {
  const db = await getDb();
  if (!db) return;

  const result = await db.insert(practiceSessions).values(session);
  return result;
}

export async function updatePracticeSession(sessionId: number, updates: Partial<InsertPracticeSession>) {
  const db = await getDb();
  if (!db) return;

  await db.update(practiceSessions).set(updates).where(eq(practiceSessions.id, sessionId));
}

export async function getPracticeSessions(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(practiceSessions).where(eq(practiceSessions.userId, userId)).orderBy(desc(practiceSessions.startedAt)).limit(limit);
}

export async function getPracticeSessionById(sessionId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(practiceSessions).where(eq(practiceSessions.id, sessionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Question Attempts
export async function createQuestionAttempt(attempt: InsertQuestionAttempt) {
  const db = await getDb();
  if (!db) return;

  const result = await db.insert(questionAttempts).values(attempt);
  return result;
}

export async function getQuestionAttemptsBySession(sessionId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(questionAttempts).where(eq(questionAttempts.sessionId, sessionId)).orderBy(desc(questionAttempts.createdAt));
}

// Chat Messages
export async function createChatMessage(message: InsertChatMessage) {
  const db = await getDb();
  if (!db) return;

  const result = await db.insert(chatMessages).values(message);
  return result;
}

export async function getChatMessages(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(chatMessages).where(eq(chatMessages.userId, userId)).orderBy(desc(chatMessages.createdAt)).limit(limit);
}

export async function clearChatMessages(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
}

// Study Topics
export async function createStudyTopic(topic: InsertStudyTopic) {
  const db = await getDb();
  if (!db) return;

  const result = await db.insert(studyTopics).values(topic);
  return result;
}

export async function getStudyTopics(category?: string, difficulty?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (category) {
    conditions.push(eq(studyTopics.category, category));
  }
  if (difficulty) {
    conditions.push(eq(studyTopics.difficulty, difficulty as any));
  }

  if (conditions.length > 0) {
    return await db.select().from(studyTopics).where(and(...conditions)).orderBy(studyTopics.category, studyTopics.topic);
  }

  return await db.select().from(studyTopics).orderBy(studyTopics.category, studyTopics.topic);
}

// Progress Statistics
export async function getUserProgressStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const sessions = await db.select().from(practiceSessions).where(eq(practiceSessions.userId, userId));

  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      accuracy: 0,
      averageScore: 0,
    };
  }

  const totalSessions = sessions.length;
  const totalQuestions = sessions.reduce((sum, s) => sum + s.totalQuestions, 0);
  const correctAnswers = sessions.reduce((sum, s) => sum + s.correctAnswers, 0);
  const totalScore = sessions.reduce((sum, s) => sum + s.score, 0);

  return {
    totalSessions,
    totalQuestions,
    correctAnswers,
    accuracy: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0,
    averageScore: totalSessions > 0 ? totalScore / totalSessions : 0,
  };
}
