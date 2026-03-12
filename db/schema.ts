import { pgTable, text, integer, boolean, timestamp, uuid, varchar, jsonb, unique } from 'drizzle-orm/pg-core';

// ── Users ────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  platformId: varchar('platform_id', { length: 100 }).notNull(),
  platform: varchar('platform', { length: 20 }).notNull(), // discord | telegram | whatsapp

  // ── Linked account (master user) ────────────────────────
  // Si este usuario es una cuenta secundaria, apunta al usuario principal
  // Si es principal o está solo, es null
  linkedToUserId: uuid('linked_to_user_id'),  // FK a users.id (self-ref, nullable)

  username: varchar('username', { length: 100 }),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  balance: integer('balance').default(0).notNull(),
  xp: integer('xp').default(0).notNull(),
  level: integer('level').default(1).notNull(),
  isVerifiedAdult: boolean('is_verified_adult').default(false).notNull(),
  isBanned: boolean('is_banned').default(false).notNull(),
  banReason: text('ban_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastSeen: timestamp('last_seen').defaultNow().notNull(),
});

// ── Link tokens (códigos temporales para vincular cuentas) ───
// Se genera cuando un usuario ya configurado escribe /linkcode
// El usuario en la nueva plataforma lo introduce con /link <código>
export const linkTokens = pgTable('link_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Usuario que genera el código (ya existente en otra plataforma)
  userId: uuid('user_id').references(() => users.id).notNull(),
  platform: varchar('platform', { length: 20 }).notNull(), // plataforma donde se generó
  token: varchar('token', { length: 12 }).notNull().unique(), // código corto: YUKXXXX1234
  expiresAt: timestamp('expires_at').notNull(),              // 10 minutos de validez
  usedAt: timestamp('used_at'),                             // null = no usado aún
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Linked accounts log (historial de vinculaciones) ─────────
export const linkedAccountsLog = pgTable('linked_accounts_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  masterUserId: uuid('master_user_id').references(() => users.id).notNull(),
  linkedUserId: uuid('linked_user_id').references(() => users.id).notNull(),
  linkedPlatform: varchar('linked_platform', { length: 20 }).notNull(),
  linkedAt: timestamp('linked_at').defaultNow().notNull(),
  // Stats migrados al vincular
  balanceMerged: integer('balance_merged').default(0).notNull(),
  xpMerged: integer('xp_merged').default(0).notNull(),
});

// ── Groups / Chats ────────────────────────────────────────────
export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  platformId: varchar('platform_id', { length: 100 }).notNull(),
  platform: varchar('platform', { length: 20 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  adultEnabled: boolean('adult_enabled').default(false).notNull(),
  musicEnabled: boolean('music_enabled').default(true).notNull(),
  aiEnabled: boolean('ai_enabled').default(true).notNull(),
  language: varchar('language', { length: 10 }).default('es').notNull(),
  prefix: varchar('prefix', { length: 5 }).default('/').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Economy ───────────────────────────────────────────────────
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromUserId: uuid('from_user_id').references(() => users.id),
  toUserId: uuid('to_user_id').references(() => users.id),
  amount: integer('amount').notNull(),
  reason: varchar('reason', { length: 200 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const inventory = pgTable('inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  itemId: varchar('item_id', { length: 100 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  acquiredAt: timestamp('acquired_at').defaultNow().notNull(),
});

export const pets = pgTable('pets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  type: varchar('type', { length: 30 }).notNull(),
  level: integer('level').default(1).notNull(),
  happiness: integer('happiness').default(100).notNull(),
  hunger: integer('hunger').default(100).notNull(),
  lastFed: timestamp('last_fed').defaultNow().notNull(),
});

export const marriages = pgTable('marriages', {
  id: uuid('id').primaryKey().defaultRandom(),
  user1Id: uuid('user1_id').references(() => users.id).notNull(),
  user2Id: uuid('user2_id').references(() => users.id).notNull(),
  marriedAt: timestamp('married_at').defaultNow().notNull(),
});

// ── Roleplay counters ─────────────────────────────────────────
export const roleplayCounts = pgTable('roleplay_counts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  received: integer('received').default(0).notNull(),
  given: integer('given').default(0).notNull(),
});

// ── Moderation ────────────────────────────────────────────────
export const warnings = pgTable('warnings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  groupId: uuid('group_id').references(() => groups.id),
  reason: text('reason').notNull(),
  issuedBy: uuid('issued_by').references(() => users.id).notNull(),
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
});

// ── Command logs ──────────────────────────────────────────────
export const commandLogs = pgTable('command_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  platform: varchar('platform', { length: 20 }).notNull(),
  userId: uuid('user_id').references(() => users.id),
  groupId: uuid('group_id').references(() => groups.id),
  command: varchar('command', { length: 100 }).notNull(),
  args: jsonb('args'),
  success: boolean('success').default(true).notNull(),
  error: text('error'),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
});

// ── Adult verification (legacy self-verify) ───────────────────
export const adultVerifications = pgTable('adult_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  verifiedAt: timestamp('verified_at').defaultNow().notNull(),
  verifiedBy: varchar('verified_by', { length: 20 }).notNull(),
});

// ── Adult access requests (admin approval flow) ───────────────
export const adultRequests = pgTable('adult_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  platform: varchar('platform', { length: 20 }).notNull(),
  platformUserId: varchar('platform_user_id', { length: 100 }).notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: varchar('reviewed_by', { length: 100 }),
  rejectionReason: text('rejection_reason'),
});
