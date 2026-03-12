import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@db/schema';
import { eq, desc } from 'drizzle-orm';

function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

function checkAuth(req: NextRequest): boolean {
  const cookie = req.cookies.get('yukiko_admin')?.value;
  return cookie === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getDb();
  const status = req.nextUrl.searchParams.get('status') ?? 'pending';
  const requests = await db
    .select()
    .from(schema.adultRequests)
    .where(eq(schema.adultRequests.status, status))
    .orderBy(desc(schema.adultRequests.requestedAt));
  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id, action, reason } = await req.json();
  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }
  const db = getDb();

  const [request] = await db
    .select()
    .from(schema.adultRequests)
    .where(eq(schema.adultRequests.id, id))
    .limit(1);

  if (!request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  const now = new Date();

  if (action === 'approve') {
    await db
      .update(schema.adultRequests)
      .set({ status: 'approved', reviewedAt: now, reviewedBy: 'admin' })
      .where(eq(schema.adultRequests.id, id));
    await db
      .update(schema.users)
      .set({ isVerifiedAdult: true })
      .where(eq(schema.users.id, request.userId));
  } else {
    await db
      .update(schema.adultRequests)
      .set({ status: 'rejected', reviewedAt: now, reviewedBy: 'admin', rejectionReason: reason ?? null })
      .where(eq(schema.adultRequests.id, id));
  }

  return NextResponse.json({ success: true });
}
