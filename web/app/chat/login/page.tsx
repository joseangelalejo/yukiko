'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChatLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const userRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => { userRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        router.push('/chat');
        router.refresh();
      } else {
        setError(data.error ?? 'Error desconocido');
      }
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-4"
      style={{ background: '#0a0a0f' }}
    >
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg"
          style={{ background: 'linear-gradient(135deg, #c084fc, #7c3aed)' }}
        >
          ❄️
        </div>
        <div className="text-center">
          <h1 className="text-white font-bold text-2xl tracking-tight">Yukiko</h1>
          <p className="text-white/40 text-sm mt-1">Inicia sesión para chatear</p>
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Usuario */}
          <div className="flex flex-col gap-1.5">
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider">
              Usuario
            </label>
            <input
              ref={userRef}
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="tu_usuario"
              className="rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.9)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(192,132,252,0.5)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
          </div>

          {/* Contraseña */}
          <div className="flex flex-col gap-1.5">
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className="rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.9)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(192,132,252,0.5)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
          </div>

          {/* Error */}
          {error && (
            <p
              className="text-sm px-3 py-2 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              ❌ {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #c084fc, #7c3aed)' }}
          >
            {loading ? 'Entrando...' : 'Entrar →'}
          </button>
        </form>
      </div>

      <p className="text-white/20 text-xs mt-6">yukiko.miniserver.online</p>
    </div>
  );
}
