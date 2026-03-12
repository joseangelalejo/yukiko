import { NextRequest, NextResponse } from 'next/server';
import { db, users, adultRequests } from '@db/index.ts';
import { eq, desc } from 'drizzle-orm';

// GET /api/admin/verifications?status=pending
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get('status') ?? 'pending';

  const requests = status === 'all'
    ? await db.select().from(adultRequests).orderBy(desc(adultRequests.requestedAt))
    : await db
        .select()
        .from(adultRequests)
        .where(eq(adultRequests.status, status as 'pending' | 'approved' | 'rejected'))
        .orderBy(desc(adultRequests.requestedAt));

  return NextResponse.json({ requests });
}

// POST /api/admin/verifications { id, action: 'approve'|'reject', reason? }
export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, action, reason } = await req.json() as {
    id: string;
    action: 'approve' | 'reject';
    reason?: string;
  };

  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const [request] = await db
    .select()
    .from(adultRequests)
    .where(eq(adultRequests.id, id))
    .limit(1);

  if (!request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  if (action === 'approve') {
    // Mark request approved
    await db.update(adultRequests).set({
      status: 'approved',
      reviewedAt: new Date(),
      reviewedBy: 'admin',
    }).where(eq(adultRequests.id, id));

    // Grant user access
    await db.update(users).set({ isVerifiedAdult: true })
      .where(eq(users.id, request.userId));

    // Notificación: guardar en una tabla temporal o enviar de inmediato  
    // Por ahora, el bot periódicamente consultará por cambios recientes
    console.log(`✅ APROBADO: ${request.displayName} (${request.platformUserId}) en ${request.platform}`);

    return NextResponse.json({ ok: true, action: 'approved', userId: request.userId });
  } else {
    await db.update(adultRequests).set({
      status: 'rejected',
      reviewedAt: new Date(),
      reviewedBy: 'admin',
      rejectionReason: reason ?? null,
    }).where(eq(adultRequests.id, id));

    console.log(`❌ RECHAZADO: ${request.displayName} (${request.platformUserId}) en ${request.platform}`);

    return NextResponse.json({ ok: true, action: 'rejected' });
  }
}
