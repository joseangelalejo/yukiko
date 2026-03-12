'use client';
import { useState, useEffect } from 'react';

type Stats = {
  totalUsers: number;
  totalGroups: number;
  commandsToday: number;
  platforms: { discord: boolean; telegram: boolean; whatsapp: boolean };
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'groups' | 'logs'>('overview');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white">
      {/* Sidebar */}
      <div className="flex">
        <aside className="w-64 min-h-screen bg-white/5 border-r border-white/10 p-6">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-2xl">🌨️</span>
            <span className="font-bold text-lg">Yukiko Admin</span>
          </div>
          <nav className="space-y-1">
            {[
              { id: 'overview', label: '📊 Resumen', tab: 'overview' },
              { id: 'users', label: '👥 Usuarios', tab: 'users' },
              { id: 'groups', label: '🏠 Grupos', tab: 'groups' },
              { id: 'logs', label: '📋 Logs', tab: 'logs' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.tab as typeof activeTab)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors text-sm ${
                  activeTab === item.tab ? 'bg-pink-500/20 text-pink-400' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
            <hr className="border-white/10 my-4" />
            <a href="/monitor" className="block px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5">
              📡 Monitor
            </a>
            <a href="/" className="block px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5">
              🌐 Web
            </a>
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 p-8">
          <h1 className="text-2xl font-bold mb-8">Panel de Administración</h1>

          {/* Platform status */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {(['discord', 'telegram', 'whatsapp'] as const).map(platform => (
              <div key={platform} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${stats?.platforms[platform] ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="capitalize font-medium">{platform}</span>
                <span className={`ml-auto text-xs ${stats?.platforms[platform] ? 'text-green-400' : 'text-red-400'}`}>
                  {stats?.platforms[platform] ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <StatCard label="Usuarios totales" value={stats?.totalUsers ?? '—'} emoji="👥" />
            <StatCard label="Grupos activos" value={stats?.totalGroups ?? '—'} emoji="🏠" />
            <StatCard label="Comandos hoy" value={stats?.commandsToday ?? '—'} emoji="⚡" />
          </div>

          {/* Quick actions */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="font-bold mb-4">Acciones rápidas</h2>
            <div className="flex flex-wrap gap-3">
              <ActionButton label="🔄 Reiniciar Discord" endpoint="/api/admin/restart?platform=discord" />
              <ActionButton label="🔄 Reiniciar Telegram" endpoint="/api/admin/restart?platform=telegram" />
              <ActionButton label="🔄 Reiniciar WhatsApp" endpoint="/api/admin/restart?platform=whatsapp" />
              <ActionButton label="💾 Backup DB" endpoint="/api/admin/backup" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, emoji }: { label: string; value: number | string; emoji: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="text-3xl mb-2">{emoji}</div>
      <div className="text-3xl font-bold text-pink-400">{value}</div>
      <div className="text-white/60 text-sm mt-1">{label}</div>
    </div>
  );
}

function ActionButton({ label, endpoint }: { label: string; endpoint: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await fetch(endpoint, { method: 'POST' }).catch(() => {});
    setLoading(false);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        done ? 'bg-green-500/20 text-green-400' : 'bg-white/10 hover:bg-white/20 text-white'
      }`}
    >
      {loading ? '⏳ ...' : done ? '✅ Hecho' : label}
    </button>
  );
}
