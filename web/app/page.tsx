import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Yukiko — Tu compañera neko para Discord, Telegram y WhatsApp',
  description: 'Bot multiplataforma kawaii con roleplay, economía, IA y más.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0d1a] via-[#1a0d2e] to-[#0d0d1a] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌨️</span>
          <span className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Yukiko
          </span>
        </div>
        <div className="flex gap-6 text-sm text-white/70">
          <a href="/admin" className="hover:text-white transition-colors">Comandos</a>
          <a href="https://joseangelalejo.github.io/yukiko" className="hover:text-white transition-colors">Docs</a>
          <a href="/admin" className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-full transition-colors">
            Panel Admin
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-4 py-24">
        <div className="text-8xl mb-6 animate-bounce">🌨️</div>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6">
          <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            Yukiko
          </span>
        </h1>
        <p className="text-xl text-white/70 max-w-2xl mx-auto mb-10">
          Tu compañera neko kawaii para <strong className="text-white">WhatsApp</strong>,{' '}
          <strong className="text-white">Discord</strong> y{' '}
          <strong className="text-white">Telegram</strong>. Roleplay, economía, IA y mucho más.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? ""}&scope=bot+applications.commands&permissions=8`}
            className="bg-[#5865F2] hover:bg-[#4752C4] px-8 py-3 rounded-full font-semibold transition-colors"
          >
            ➕ Añadir a Discord
          </a>
          <a
            href="https://t.me/YukikoBot"
            className="bg-[#0088cc] hover:bg-[#006699] px-8 py-3 rounded-full font-semibold transition-colors"
          >
            ➕ Añadir a Telegram
          </a>
          <a
            href="/admin"
            className="border border-white/30 hover:border-white/60 px-8 py-3 rounded-full font-semibold transition-colors"
          >
            📋 Ver comandos
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-16 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-white/90">¿Qué puede hacer Yukiko?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(f => (
            <div
              key={f.title}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors"
            >
              <div className="text-4xl mb-4">{f.emoji}</div>
              <h3 className="text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-white/60 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="px-8 py-16 bg-white/5 border-y border-white/10">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: 'Plataformas', value: '3' },
            { label: 'Comandos', value: '50+' },
            { label: 'GIFs de roleplay', value: '10k+' },
            { label: 'APIs integradas', value: '8+' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-4xl font-extrabold text-pink-400">{s.value}</div>
              <div className="text-white/60 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-white/40 text-sm">
        <p>🌨️ Yukiko — Hecho con ❤️ por <a href="https://github.com/joseangelalejo" className="hover:text-white">joseangelalejo</a></p>
        <p className="mt-1">WhatsApp · Discord · Telegram</p>
      </footer>
    </div>
  );
}

const features = [
  {
    emoji: '🎭',
    title: 'Roleplay Anime',
    desc: 'Más de 50 acciones (abrazar, besar, golpear...) con miles de GIFs anime de Tenor.',
  },
  {
    emoji: '💰',
    title: 'Economía Global',
    desc: 'Monedas, niveles, mascotas, matrimonios y ranking global compartido entre plataformas.',
  },
  {
    emoji: '🤖',
    title: 'Inteligencia Artificial',
    desc: 'Chat con GPT-4o, generación de imágenes con DALL-E 3 y traducción automática.',
  },
  {
    emoji: '🔞',
    title: 'Contenido +18',
    desc: 'Hentai de Danbooru y GIFs de RedGifs, solo en grupos verificados y usuarios adultos.',
  },
  {
    emoji: '🔨',
    title: 'Moderación',
    desc: 'Ban, kick, warn, logs y configuración por grupo desde el panel de administración.',
  },
  {
    emoji: '📊',
    title: 'Monitorización',
    desc: 'Panel de métricas en tiempo real + Grafana opcional para análisis avanzado.',
  },
];
