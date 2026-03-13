import { db, users, commandLogs, cooldowns } from '../../db/index.js';
import { eq, and, gt, lte } from 'drizzle-orm';
import type { Platform, YukikoUser } from './types.js';

// ── XP / Levels ───────────────────────────────────────────────
export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

// ── Resolve effective user (master si está vinculado) ─────────
// Toda la economía y stats deben usar esto para centralizar en el master.
export async function resolveEffectiveUser(userId: string): Promise<YukikoUser | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  if (user.linkedToUserId) {
    const [master] = await db.select().from(users).where(eq(users.id, user.linkedToUserId)).limit(1);
    return (master as YukikoUser) ?? (user as YukikoUser);
  }

  return user as YukikoUser;
}

// ── User upsert ───────────────────────────────────────────────
export async function getOrCreateUser(
  platformId: string,
  platform: Platform,
  displayName: string,
  username?: string
): Promise<YukikoUser> {
  const existing = await db
    .select()
    .from(users)
    .where(and(eq(users.platformId, platformId), eq(users.platform, platform)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(users)
      .set({ lastSeen: new Date(), displayName })
      .where(eq(users.id, existing[0].id));
    return existing[0] as YukikoUser;
  }

  const [created] = await db
    .insert(users)
    .values({ platformId, platform, displayName, username })
    .returning();

  return created as YukikoUser;
}

// ── Cooldowns (persistent in DB) ──────────────────────────────
export async function isOnCooldown(userId: string, command: string, seconds: number): Promise<boolean> {
  const effective = await resolveEffectiveUser(userId);
  if (!effective) return false;

  const now = new Date();
  const [existing] = await db
    .select()
    .from(cooldowns)
    .where(and(eq(cooldowns.userId, effective.id), eq(cooldowns.command, command), gt(cooldowns.expiresAt, now)))
    .limit(1);

  return !!existing;
}

export async function remainingCooldown(userId: string, command: string, seconds: number): Promise<number> {
  const effective = await resolveEffectiveUser(userId);
  if (!effective) return 0;

  const now = new Date();
  const [existing] = await db
    .select()
    .from(cooldowns)
    .where(and(eq(cooldowns.userId, effective.id), eq(cooldowns.command, command), gt(cooldowns.expiresAt, now)))
    .limit(1);

  if (!existing) return 0;
  const remainingMs = existing.expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

// ── Set cooldown ──────────────────────────────────────────────
export async function setCooldown(userId: string, command: string, seconds: number): Promise<void> {
  const effective = await resolveEffectiveUser(userId);
  if (!effective) return;

  const expiresAt = new Date(Date.now() + seconds * 1000);
  await db.insert(cooldowns).values({ userId: effective.id, command, expiresAt });
}

// ── Clean expired cooldowns ───────────────────────────────────
export async function cleanExpiredCooldowns(): Promise<void> {
  const now = new Date();
  await db.delete(cooldowns).where(lte(cooldowns.expiresAt, now));
}

// ── Add XP — opera sobre el master ───────────────────────────
export async function addXp(platformId: string, amount: number, platform?: Platform): Promise<{ leveled: boolean; newLevel: number }> {
  let internalUser: YukikoUser | null = null;
  if (platform) {
    const [found] = await db.select().from(users)
      .where(and(eq(users.platformId, platformId), eq(users.platform, platform)))
      .limit(1);
    internalUser = (found as YukikoUser) ?? null;
  } else {
    const [found] = await db.select().from(users).where(eq(users.id, platformId)).limit(1);
    internalUser = (found as YukikoUser) ?? null;
  }
  if (!internalUser) return { leveled: false, newLevel: 1 };

  const effective = internalUser.linkedToUserId
    ? (((await db.select().from(users).where(eq(users.id, internalUser.linkedToUserId)).limit(1))[0] as YukikoUser) ?? internalUser)
    : internalUser;

  const newXp = effective.xp + amount;
  const newLevel = levelFromXp(newXp);
  const leveled = newLevel > effective.level;

  await db.update(users).set({ xp: newXp, level: newLevel }).where(eq(users.id, effective.id));
  return { leveled, newLevel };
}

// ── Log command ───────────────────────────────────────────────
export async function logCommand(opts: {
  platform: Platform;
  userId: string;
  groupId?: string;
  command: string;
  args?: unknown[];
  success?: boolean;
  error?: string;
}) {
  // Resolve internal user id from platformId
  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.platformId, opts.userId), eq(users.platform, opts.platform)))
    .limit(1);
  const internalUserId = userRows[0]?.id ?? null;

  await db.insert(commandLogs).values({
    platform: opts.platform,
    userId: internalUserId,
    command: opts.command,
    args: opts.args ?? [],
    success: opts.success ?? true,
    error: opts.error,
  });
}
