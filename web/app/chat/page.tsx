'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────
type Role = 'user' | 'yukiko';
interface Message {
  id: string;
  role: Role;
  text?: string;
  imageUrl?: string;
  loading?: boolean;
  ts: Date;
}

// ── Quick commands ─────────────────────────────────────────────
const QUICK = [
  { label: '❓ help', cmd: '/help' },
  { label: '🤖 ask', cmd: '/ask ' },
  { label: '🎨 imagine', cmd: '/imagine ' },
  { label: '🌐 translate', cmd: '/translate español ' },
];

// ── Markdown-lite renderer ─────────────────────────────────────
function renderText(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold **text**
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return (
      <span key={i}>
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={j} className="font-semibold text-purple-300">{part.slice(2, -2)}</strong>;
          if (part.startsWith('`') && part.endsWith('`'))
            return <code key={j} className="bg-white/10 px-1.5 py-0.5 rounded text-pink-300 font-mono text-sm">{part.slice(1, -1)}</code>;
          return part;
        })}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

// ── Bubble ────────────────────────────────────────────────────
function Bubble({ msg }: { msg: Message }) {
  const isYukiko = msg.role === 'yukiko';

  return (
    <div className={`flex gap-3 ${isYukiko ? 'justify-start' : 'justify-end'} group`}>
      {isYukiko && (
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-base"
          style={{ background: 'linear-gradient(135deg, #c084fc, #7c3aed)' }}>
          ❄️
        </div>
      )}

      <div className={`max-w-[72%] ${isYukiko ? '' : 'order-first'}`} style={{ order: isYukiko ? 0 : 1 }}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isYukiko
              ? 'rounded-tl-sm text-white/90'
              : 'rounded-tr-sm text-white/95'
          }`}
          style={{
            background: isYukiko
              ? 'rgba(255,255,255,0.07)'
              : 'linear-gradient(135deg, #7c3aed99, #c084fc66)',
            border: isYukiko ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(192,132,252,0.3)',
          }}
        >
          {msg.loading ? (
            <span className="flex gap-1 items-center h-4">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          ) : (
            <>
              {msg.text && <p className="whitespace-pre-wrap break-words">{renderText(msg.text)}</p>}
              {msg.imageUrl && (
                <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
                  
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={msg.imageUrl}
                    alt="Imagen generada"
                    className="rounded-xl max-w-full object-cover"
                    style={{ maxHeight: 280 }}
                  />
                </a>
              )}
            </>
          )}
        </div>
        <p className="text-[10px] text-white/25 mt-1 px-1">
          {msg.ts.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {!isYukiko && (
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', order: 2 }}>
          Tú
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'yukiko',
      text: '¡Hola! 🌸 Soy Yukiko, tu compañera neko kawaii.\n\nPuedes escribirme directamente o usar comandos como `/ask`, `/imagine` o `/help`.',
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text, ts: new Date() };
    const loadingMsg: Message = { id: crypto.randomUUID(), role: 'yukiko', loading: true, ts: new Date() };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setLoading(true);
    setShowQuick(false);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json() as { text?: string; imageUrl?: string; error?: string };

      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id
          ? { ...m, loading: false, text: data.error ? `❌ ${data.error}` : data.text, imageUrl: data.imageUrl }
          : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id
          ? { ...m, loading: false, text: '❌ No se pudo conectar con el homelab.' }
          : m
      ));
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
        <a href="/" className="text-white/40 hover:text-white/70 transition-colors text-sm mr-1">←</a>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #c084fc, #7c3aed)' }}>
          ❄️
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">Yukiko</p>
          <p className="text-white/40 text-xs mt-0.5">Tu compañera neko kawaii</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white/40 text-xs">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Quick commands */}
      {showQuick && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
          {QUICK.map(q => (
            <button
              key={q.cmd}
              onClick={() => { setInput(q.cmd); inputRef.current?.focus(); setShowQuick(false); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: 'rgba(192,132,252,0.12)',
                border: '1px solid rgba(192,132,252,0.25)',
                color: '#c084fc',
              }}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 flex items-end gap-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
        <button
          onClick={() => setShowQuick(v => !v)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold transition-all flex-shrink-0"
          style={{
            background: showQuick ? 'rgba(192,132,252,0.2)' : 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#c084fc',
          }}
        >
          /
        </button>

        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Escribe un mensaje o /comando..."
          rows={1}
          maxLength={500}
          className="flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.9)',
            maxHeight: 120,
            overflowY: 'auto',
          }}
          onInput={e => {
            const t = e.currentTarget;
            t.style.height = 'auto';
            t.style.height = Math.min(t.scrollHeight, 120) + 'px';
          }}
        />

        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-base transition-all flex-shrink-0 disabled:opacity-30"
          style={{ background: 'linear-gradient(135deg, #c084fc, #7c3aed)' }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
