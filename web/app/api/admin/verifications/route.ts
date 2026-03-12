import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/verifications?status=pending
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Placeholder response - real data handled by bot checks
  return NextResponse.json({ requests: [] });
}

// POST /api/admin/verifications { id, action: 'approve'|'reject', reason? }
export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, action, reason } = await req.json();

  try {
    if (action === 'approve') {
      console.log(`[ADMIN] Solicitud +18 aprobada: ${id}`);
    } else if (action === 'reject') {
      console.log(`[ADMIN] Solicitud +18 rechazada: ${id} - Razon: ${reason}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating verification:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
