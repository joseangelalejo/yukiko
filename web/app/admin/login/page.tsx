'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push('/admin');
    } else {
      setError('Contraseña incorrecta');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0d1a] via-[#1a0d2e] to-[#0d0d1a] flex items-center justify-center">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-10 w-full max-w-sm text-white">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌨️</div>
          <h1 className="text-2xl font-bold">Yukiko Admin</h1>
          <p className="text-white/50 text-sm mt-1">Acceso restringido</p>
        </div>
        <div className="space-y-4">
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm placeholder-white/30 focus:outline-none focus:border-pink-500 transition-colors"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={loading || !password}
            className="w-full bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors"
          >
            {loading ? '⏳ Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
