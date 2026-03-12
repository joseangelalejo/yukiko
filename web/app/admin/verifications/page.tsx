'use client';
import { useState, useEffect } from 'react';

interface AdultRequest {
  id: string;
  displayName: string;
  platform: string;
  platformUserId: string;
  status: string;
  requestedAt: string;
}

export default function VerificationsPage() {
  const [requests, setRequests] = useState<AdultRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/verifications?status=${filter}`);
    const data = await res.json();
    setRequests(data.requests ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function act(id: string, action: 'approve' | 'reject') {
    await fetch('/api/admin/verifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, reason: rejectReason[id] }),
    });
    load();
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto' }}>
      <h1>🔞 Verificaciones +18</h1>
      <a href="/admin" style={{ color: '#888', fontSize: 14 }}>← Volver al panel</a>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
        {(['pending', 'approved', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{
              padding: '0.4rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: filter === s ? '#7c3aed' : '#e5e7eb',
              color: filter === s ? '#fff' : '#111',
            }}>
            {s === 'pending' ? '⏳ Pendientes' : s === 'approved' ? '✅ Aprobadas' : '❌ Rechazadas'}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ marginTop: '2rem', color: '#888' }}>Cargando...</p>
      ) : requests.length === 0 ? (
        <p style={{ marginTop: '2rem', color: '#888' }}>No hay solicitudes {filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobadas' : 'rechazadas'}.</p>
      ) : (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map(r => (
            <div key={r.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{r.displayName}</strong>
                  <span style={{ marginLeft: 8, color: '#888', fontSize: 13 }}>
                    {r.platform} · {r.platformUserId}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: '#aaa' }}>
                  {new Date(r.requestedAt).toLocaleString('es-ES')}
                </span>
              </div>

              {filter === 'pending' && (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => act(r.id, 'approve')}
                    style={{ padding: '0.3rem 0.8rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
                    ✅ Aprobar
                  </button>
                  <input
                    placeholder="Motivo rechazo (opcional)"
                    value={rejectReason[r.id] ?? ''}
                    onChange={e => setRejectReason(prev => ({ ...prev, [r.id]: e.target.value }))}
                    style={{ flex: 1, padding: '0.3rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 13 }}
                  />
                  <button onClick={() => act(r.id, 'reject')}
                    style={{ padding: '0.3rem 0.8rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
                    ❌ Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
