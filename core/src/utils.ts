import { db, users, commandLogs } from '../../db/index.js';
import { eq, and } from 'drizzle-orm';
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

// ── Cooldowns (in-memory for speed) ──────────────────────────
const cooldowns = new Map<string, number>();

export function isOnCooldown(userId: string, command: string, seconds: number): boolean {
  const key = `${userId}:${command}`;
  const last = cooldowns.get(key) ?? 0;
  if (Date.now() - last < seconds * 1000) return true;
  cooldowns.set(key, Date.now());
  return false;
}

export function remainingCooldown(userId: string, command: string, seconds: number): number {
  const key = `${userId}:${command}`;
  const last = cooldowns.get(key) ?? 0;
  return Math.max(0, seconds - Math.floor((Date.now() - last) / 1000));
}

// ── Add XP — opera sobre el master ───────────────────────────
export async function addXp(userId: string, amount: number): Promise<{ leveled: boolean; newLevel: number }> {
  const effective = await resolveEffectiveUser(userId);
  if (!effective) return { leveled: false, newLevel: 1 };

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
