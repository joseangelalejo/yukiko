// ============================================================
// Yukiko Core — Shared Types
// ============================================================

export type Platform = 'discord' | 'telegram' | 'mobile';

export type CommandContext = {
  platform: Platform;
  userId: string;        // ID de la plataforma (discord snowflake / telegram id / mobile uuid)
  chatId: string;
  groupId?: string;
  username?: string;
  displayName: string;
  isAdmin: boolean;
  isGroup: boolean;
  args: string[];
  rawText: string;
  reply: (text: string) => Promise<void>;
  replyWithImage: (url: string, caption?: string) => Promise<void>;
  replyWithGif: (url: string, caption?: string) => Promise<void>;
  // DM directo al usuario (para onboarding en privado)
  replyDM?: (text: string) => Promise<void>;
};

export type Command = {
  name: string;
  aliases?: string[];
  description: string;
  category: CommandCategory;
  platforms: Platform[];
  adminOnly?: boolean;
  groupOnly?: boolean;
  adultOnly?: boolean;
  cooldown?: number; // seconds
  execute: (ctx: CommandContext) => Promise<void>;
};

export type CommandCategory =
  | 'roleplay'
  | 'economy'
  | 'adult'
  | 'moderation'
  | 'music'
  | 'ai'
  | 'utility'
  | 'fun';

export type YukikoUser = {
  id: string;
  platformId: string;
  platform: Platform;
  linkedToUserId?: string | null;  // FK a otro users.id (el "master")
  username?: string | null;
  displayName: string;
  balance: number;
  xp: number;
  level: number;
  isVerifiedAdult: boolean;
  isBanned: boolean;
  banReason?: string | null;
  createdAt: Date;
  lastSeen: Date;
};

export type YukikoGroup = {
  id: string;
  platformId: string;
  platform: Platform;
  name: string;
  adultEnabled: boolean;
  musicEnabled: boolean;
  aiEnabled: boolean;
  language: string;
  prefix: string;
  createdAt: Date;
};

export type LogEntry = {
  id: string;
  platform: Platform;
  userId: string;
  command: string;
  groupId?: string;
  args: string[];
  success: boolean;
  error?: string;
  executedAt: Date;
};

// ── Link system ───────────────────────────────────────────────

export type LinkToken = {
  id: string;
  userId: string;
  platform: Platform;
  token: string;        // formato: YUK-XXXX-XXXX
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
};

export type LinkedAccountInfo = {
  platform: Platform;
  displayName: string;
  platformId: string;
};

export type OnboardingResult = {
  isNew: boolean;
  userId: string;
};
