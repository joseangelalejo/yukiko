'use client';
import { useState, useEffect, useRef } from 'react';

type Metrics = {
  uptime: number;
  cpu: number;
  memory: { used: number; total: number };
  commandsPerHour: number[];
  latency: { discord: number; telegram: number; mobile: number; db: number };
  errors: number;
};

export default function MonitorPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const fetch_ = () =>
      fetch('/api/monitor/metrics')
        .then(r => r.json())
        .then((m: Metrics) => {
          setMetrics(m);
          setHistory(prev => [...prev.slice(-29), m.cpu]);
        })
        .catch(() => {});

    fetch_();
    intervalRef.current = setInterval(fetch_, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">📡 Monitorización en tiempo real</h1>
          <div className="flex items-center gap-2 text-sm text-green-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Actualizando cada 5s
          </div>
        </div>

        {/* System metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Uptime"
            value={metrics ? formatUptime(metrics.uptime) : '—'}
            emoji="⏱️"
            color="text-green-400"
          />
          <MetricCard
            label="CPU"
            value={metrics ? `${metrics.cpu.toFixed(1)}%` : '—'}
            emoji="💻"
            color={metrics && metrics.cpu > 80 ? 'text-red-400' : 'text-blue-400'}
          />
          <MetricCard
            label="RAM"
            value={metrics ? `${metrics.memory.used}/${metrics.memory.total} MB` : '—'}
            emoji="🧠"
            color="text-purple-400"
          />
          <MetricCard
            label="Errores hoy"
            value={metrics?.errors ?? '—'}
            emoji="❌"
            color={metrics && metrics.errors > 10 ? 'text-red-400' : 'text-yellow-400'}
          />
        </div>

        {/* CPU Chart (simple) */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
          <h2 className="font-bold mb-4">CPU History (últimos 30 puntos)</h2>
          <div className="flex items-end gap-1 h-20">
            {history.map((v, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t transition-all ${v > 80 ? 'bg-red-400' : v > 50 ? 'bg-yellow-400' : 'bg-green-400'}`}
                style={{ height: `${Math.max(4, v)}%` }}
                title={`${v.toFixed(1)}%`}
              />
            ))}
            {history.length === 0 && (
              <div className="text-white/40 text-sm">Sin datos aún...</div>
            )}
          </div>
        </div>

        {/* API latency */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
          <h2 className="font-bold mb-4">Latencia de APIs</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics && Object.entries(metrics.latency).map(([name, ms]) => (
              <div key={name} className="text-center">
                <div className={`text-2xl font-bold ${ms < 200 ? 'text-green-400' : ms < 500 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {ms}ms
                </div>
                <div className="text-white/60 text-sm capitalize">{name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Grafana link */}
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
          <h2 className="font-bold mb-2">📊 Grafana Dashboard</h2>
          <p className="text-white/60 text-sm mb-4">
            Para análisis avanzado, historial completo y alertas configura Grafana + Prometheus.
          </p>
          <a
            href={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3001`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Abrir Grafana →
          </a>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, emoji, color }: {
  label: string; value: string | number; emoji: string; color: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
      <div className="text-2xl mb-2">{emoji}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-white/60 text-xs mt-1">{label}</div>
    </div>
  );
}
