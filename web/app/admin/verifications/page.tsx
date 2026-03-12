'use client';
import { useState, useEffect } from 'react';

type VerificationRequest = {
  id: string;
  displayName: string;
  platform: string;
  platformUserId: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
};

export default function VerificationsPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/verifications?status=${filter}`);
    const data = await res.json();
    setRequests(data.requests ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [filter]);

  const approve = async (id: string) => {
    await fetch('/api/admin/verifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'approve' }),
    });
    fetchRequests();
  };

  const reject = async (id: string) => {
    await fetch('/api/admin/verifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'reject', reason: rejectionReason }),
    });
    setRejectingId(null);
    setRejectionReason('');
    fetchRequests();
  };

  const PLATFORM_EMOJI: Record<string, string> = {
    discord: '🎮',
    telegram: '✈️',
    whatsapp: '📱',
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">🔞 Verificaciones +18</h1>
            <p className="text-white/50 text-sm mt-1">
              Aprueba o rechaza solicitudes de acceso a contenido adulto
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="bg-pink-500 text-white text-sm font-bold px-3 py-1 rounded-full">
              {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-pink-500 text-white'
                  : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20'
              }`}
            >
              {f === 'pending' ? '⏳' : f === 'approved' ? '✅' : f === 'rejected' ? '❌' : '📋'} {f}
            </button>
          ))}
        </div>

        {/* Request list */}
        {loading ? (
          <div className="text-center text-white/40 py-16">Cargando...</div>
        ) : requests.length === 0 ? (
          <div className="text-center text-white/40 py-16 bg-white/5 rounded-xl border border-white/10">
            <div className="text-4xl mb-3">🌸</div>
            <p>No hay solicitudes {filter !== 'all' ? filter + 's' : ''}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div
                key={req.id}
                className={`bg-white/5 border rounded-xl p-5 transition-colors ${
                  req.status === 'pending'
                    ? 'border-yellow-500/30 bg-yellow-500/5'
                    : req.status === 'approved'
                    ? 'border-green-500/20'
                    : 'border-red-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{req.displayName}</span>
                      <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                        {PLATFORM_EMOJI[req.platform]} {req.platform}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        req.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {req.status === 'pending' ? '⏳ Pendiente' :
                         req.status === 'approved' ? '✅ Aprobado' : '❌ Rechazado'}
                      </span>
                    </div>
                    <div className="text-white/40 text-xs">
                      ID: {req.platformUserId} · Solicitado: {new Date(req.requestedAt).toLocaleString('es-ES')}
                    </div>
                  </div>

                  {/* Actions */}
                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => approve(req.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        ✅ Aprobar
                      </button>
                      <button
                        onClick={() => setRejectingId(req.id)}
                        className="bg-red-500/20 hover:bg-red-500/40 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        ❌ Rechazar
                      </button>
                    </div>
                  )}
                </div>

                {/* Rejection form */}
                {rejectingId === req.id && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-sm text-white/60 mb-2">Motivo del rechazo (opcional):</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        placeholder="Ej: Cuenta nueva sin actividad"
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-pink-500"
                      />
                      <button
                        onClick={() => reject(req.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Confirmar rechazo
                      </button>
                      <button
                        onClick={() => setRejectingId(null)}
                        className="bg-white/10 hover:bg-white/20 text-white/60 px-3 py-2 rounded-lg text-sm transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
