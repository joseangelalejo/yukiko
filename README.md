<div align="center">
  <img src="mobile-app/assets/yukiko-banner-github.png" alt="Yukiko Bot Banner" width="100%" />
  <br/><br/>
  <img src="mobile-app/assets/yukiko-logo-128.png" alt="Yukiko Logo" width="80" style="border-radius:50%;" />

  <h1>Yukiko Bot</h1>
  <p><em>Tu compañera neko kawaii multiplataforma — Discord, Telegram, Mobile & Web</em></p>

  [![Deploy](https://github.com/joseangelalejo/yukiko/actions/workflows/deploy.yml/badge.svg)](https://github.com/joseangelalejo/yukiko/actions)
  [![GitHub Pages](https://img.shields.io/badge/docs-live-pink?logo=github)](https://joseangelalejo.github.io/yukiko/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
  [![Node.js 20+](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://typescriptlang.org)
</div>

---

## 🚀 Estado Actual

| Componente | Status | Detalles |
|---|---|---|
| **Discord** | ✅ ONLINE | Yukiko#3557 (slash commands) |
| **Telegram** | ✅ ONLINE | @YukikoNeko_bot |
| **Mobile** | ✅ ONLINE | WebSocket puerto 3002 |
| **Web Chat** | ✅ ONLINE | [your-app-domain.com/chat](https://your-app-domain.com/chat) |
| **Web (Next.js)** | ✅ ONLINE | [yukiko.vercel.app](https://yukiko.vercel.app) · [your-app-domain.com](https://your-app-domain.com) |
| **Admin dashboard** | ✅ ONLINE | [your-app-domain.com/admin](https://your-app-domain.com/admin) |
| **Base de datos** | ✅ READY | Neon PostgreSQL |
| **Último commit** | ✅ Ver [commits](https://github.com/joseangelalejo/yukiko/commits/main) | — |

---

## 📖 Documentación

**[→ joseangelalejo.github.io/yukiko](https://joseangelalejo.github.io/yukiko/)**

---

## ✨ Módulos

| Módulo | Comandos | Discord | Telegram | Mobile | Web Chat |
|---|---|:---:|:---:|:---:|:---:|
| 🎭 Roleplay | hug, kiss, pat, slap, dance, +8 más | ✅ | ✅ | ✅ | — |
| 💰 Economía | balance, daily, transfer, top, shop, buy, inventory | ✅ | ✅ | ✅ | — |
| 🤖 IA | ask, imagine, rp, translate | ✅ | ✅ | ✅ | ✅ |
| 🔨 Moderación | warn, warns, ban, unban, clearban, prefix, stats, help | ✅ | ✅ | ✅ | — |
| 🔞 +18 | hentai, gif18, adult on/off, verify18 | ✅ | ✅ | — | — |
| 🔗 Link | link, linkcode, accounts, unlink | ✅ | ✅ | ✅ | — |
| 🎵 Música | play, stop, skip, queue *(próximamente)* | 🔜 | — | — | — |

---

## 🚀 Instalación rápida

### Arch Linux
```bash
git clone git@github.com:joseangelalejo/yukiko.git
cd yukiko
bash scripts/install-arch.sh
cp .env.example .env
npm install
npx drizzle-kit push
npm run dev
```

### Windows
```powershell
Set-ExecutionPolicy Bypass -Scope Process
.\scripts\install-windows.ps1

# O con Python (sin admin):
python scripts\install-windows.py
```

---

## 🏗️ Estructura
```
yukiko/
├── core/           # Tipos, registry, utils compartidos
├── platforms/
│   ├── discord/    # Discord.js — slash commands
│   ├── telegram/   # Grammy — BotFather integration
│   └── mobile/     # WebSocket server puerto 3002
├── modules/
│   ├── roleplay/   # GIFs via Giphy API
│   ├── economy/    # Monedas, niveles, inventario, tienda
│   ├── adult/      # Gelbooru con verificación +18
│   ├── ai/         # Ollama (llama3.2) + Pollinations.ai
│   ├── moderation/ # Warn, ban, logs
│   ├── music/      # Scaffold — provider pendiente de decidir
│   └── link/       # Vinculación de cuentas multiplataforma
├── mobile-app/     # App Android (React Native/Expo)
├── web/            # Next.js → Vercel (landing + admin + monitor + chat)
│   └── app/
│       ├── chat/       # Chat web estilo ChatGPT
│       └── api/chat/   # API Route → homelab agent
├── db/             # Drizzle ORM schema → Neon PostgreSQL
├── homelab-agent/  # Agente HTTP: restart/backup/status/chat
├── ssh-cli/        # CLI remota para gestionar desde terminal
├── scripts/        # install-arch.sh, vercel-deploy.sh, vercel-undeploy.sh...
├── docs/           # GitHub Pages
└── .github/        # CI/CD: lint → Vercel + SSH homelab + Pages
```

---

## 🖥️ Deploy en homelab con PM2

```bash
ssh your-username@your-hostname

# Ver estado
yk-status
yk-logs

# Después de pull de cambios
git pull origin main
npm install
npm run build
yk-restart-all
```

**Procesos PM2:**

| Proceso | Descripción |
|---|---|
| `yukiko-discord` | Bot Discord |
| `yukiko-telegram` | Bot Telegram |
| `yukiko-mobile` | WebSocket server (puerto 3002) |
| `yukiko-agent` | Agente HTTP (puerto 3001) |
| `yukiko-web` | Next.js panel (puerto 3000) |

**Gestión Vercel:**

```bash
yk-deploy      # Despliega web panel en producción
yk-undeploy    # Elimina todos los deployments
```

**Flujo CI/CD:**
1. `git push origin dev` → GitHub Actions
2. Lint & Type Check
3. Pull Request `dev` → `main` (requiere lint verde)
4. Deploy bots vía SSH al homelab
5. Deploy web automático a Vercel
6. Deploy docs a GitHub Pages

---

## 💬 Chat Web

Disponible en [your-app-domain.com/chat](https://your-app-domain.com/chat)

Interfaz de chat estilo ChatGPT que conecta con el homelab via API Route de Next.js → agente en puerto 3001.

**Comandos disponibles:**
- `/ask <pregunta>` — IA con Ollama (llama3.2:3b)
- `/imagine <descripción>` — Generación de imágenes con Pollinations.ai
- `/translate <idioma> <texto>` — Traducción automática via IA
- `/help` — Lista de comandos
- Texto libre → tratado automáticamente como `/ask`

---

## 📊 Panel de Administración

Disponible en [your-app-domain.com/admin](https://your-app-domain.com/admin)

- Estado de plataformas en tiempo real (Discord, Telegram, Mobile)
- Gestión de usuarios y grupos
- Aprobar/rechazar solicitudes +18 (`/admin/verifications`)
- Logs de comandos y métricas
- Restart y backup desde el panel

---

## 🛠️ Stack

| Servicio | Uso | Plan |
|---|---|---|
| [Neon](https://neon.tech) | PostgreSQL serverless | Gratis |
| [Vercel](https://vercel.com) | Web (Next.js) | Gratis |
| GitHub Pages | Documentación | Gratis |
| GitHub Actions | CI/CD | Gratis |
| Giphy API | GIFs roleplay | Gratis |
| Gelbooru | Imágenes y GIFs +18 | Gratis |
| Ollama (llama3.2:3b) | IA local | Self-hosted |
| Pollinations.ai | Generación de imágenes | Gratis |
| Homelab Proxmox VE | Bots 24/7 (32 GB RAM DDR4) | Self-hosted |

---

## 🔞 Sistema de verificación +18

1. **Solo en grupos** — No funciona en privado
2. **Activación por admin** — `/adult on` solo lo ejecuta un admin del grupo
3. **Verificación de edad** — Cada usuario usa `/verify18` y el admin aprueba desde el panel web
4. **Notificación automática** — El usuario recibe DM al ser aprobado o rechazado
5. **Logs completos** — Todos los accesos quedan registrados en la BD

---

## 📝 License

MIT © [joseangelalejo](https://github.com/joseangelalejo)

---

*[Hub personal](https://your-domain.com/) · [GitHub](https://github.com/joseangelalejo) · [Documentación](https://joseangelalejo.github.io/yukiko/) · [Panel web](https://your-app-domain.com)*
