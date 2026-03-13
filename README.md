<div align="center">
  <img src="yukiko-banner-github.png" alt="Yukiko Bot Banner" width="100%" />
  <br/><br/>
  <img src="yukiko-logo-128.png" alt="Yukiko Logo" width="80" style="border-radius:50%;" />

  <h1>Yukiko Bot</h1>
  <p><em>Tu compañera neko kawaii multiplataforma — Discord, Telegram &amp; WhatsApp</em></p>

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
| **WhatsApp** | ✅ ONLINE | Sesión activa (34694244477) |
| **Web (Next.js)** | ✅ ONLINE | [yukiko.vercel.app](https://yukiko.vercel.app) · [yukiko.miniserver.online](https://yukiko.miniserver.online) |
| **Admin dashboard** | ✅ ONLINE | [yukiko.miniserver.online/admin](https://yukiko.miniserver.online/admin) |
| **Base de datos** | ✅ READY | Neon PostgreSQL |
| **Último commit** | ✅ Ver [commits](https://github.com/joseangelalejo/yukiko/commits/main) | — |

---

## 📖 Documentación

**[→ joseangelalejo.github.io/yukiko](https://joseangelalejo.github.io/yukiko/)**

📋 **Documentación interna:**
- [ALIASES_YUKIKO.md](ALIASES_YUKIKO.md) — Referencia completa de aliases y comandos del servidor
- [SIGUIENTES_PASOS.txt](SIGUIENTES_PASOS.txt) — Instrucciones paso a paso para servidor
- [INDICE_DOCUMENTACION.txt](INDICE_DOCUMENTACION.txt) — Índice completo de docs

---

## ✨ Módulos

| Módulo | Comandos | Discord | Telegram | WhatsApp |
|---|---|:---:|:---:|:---:|
| 🎭 Roleplay | hug, kiss, pat, slap, dance, +8 más | ✅ | ✅ | ✅ |
| 💰 Economía | balance, daily, transfer, top, shop, buy, inventory | ✅ | ✅ | ✅ |
| 🤖 IA | ask, imagine, rp, translate | ✅ | ✅ | ✅ |
| 🔨 Moderación | warn, warns, ban, unban, clearban, prefix, stats, help | ✅ | ✅ | ✅ |
| 🔞 +18 | hentai, redgifs, adult on/off, verify18 | ✅ | ✅ | ✅ |
| 🔗 Link | link, linkcode, accounts, unlink | ✅ | ✅ | ✅ |

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
│   └── whatsapp/   # Baileys — protocolo WA Web
├── modules/
│   ├── roleplay/   # GIFs via Giphy API
│   ├── economy/    # Monedas, niveles, inventario, tienda
│   ├── adult/      # Danbooru + RedGifs con verificación +18
│   ├── ai/         # Ollama (llama3.2) + Pollinations.ai
│   ├── moderation/ # Warn, ban, logs
│   └── link/       # Vinculación de cuentas multiplataforma
├── web/            # Next.js → Vercel (landing + admin + monitor)
├── db/             # Drizzle ORM schema → Neon PostgreSQL
├── homelab-agent/  # Agente HTTP para restart/backup desde web
├── ssh-cli/        # CLI remota para gestionar desde terminal
├── scripts/        # install-arch.sh, install-windows.ps1/py, dev.sh...
├── docs/           # GitHub Pages
└── .github/        # CI/CD: lint → Vercel + SSH homelab + Pages
```

---

## 🖥️ Deploy en homelab con PM2
```bash
ssh dockerja@dockerja

# Ver estado
yk-status
yk-logs

# Después de pull de cambios
git pull origin main
npm install
npm run build
yk-restart-all
```

Ver referencia completa de aliases: [ALIASES_YUKIKO.md](ALIASES_YUKIKO.md)

**Flujo CI/CD:**
1. `git push origin dev` → GitHub Actions
2. Lint & Type Check
3. Pull Request `dev` → `main` (requiere lint verde)
4. Deploy bots vía SSH al homelab
5. Deploy web automático a Vercel
6. Deploy docs a GitHub Pages

---

## 🔧 SSH CLI
```bash
yukiko status
yukiko restart discord
yukiko restart all
yukiko logs telegram --tail
yukiko users -n 10
yukiko ban abc123 -r "Spam"
yukiko backup
yukiko deploy
```

---

## 📊 Panel de Administración

Disponible en [yukiko.miniserver.online/admin](https://yukiko.miniserver.online/admin)

- Estado de plataformas en tiempo real
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
| Danbooru | Imágenes +18 | Gratis |
| RedGifs | GIFs +18 | Gratis |
| Ollama (llama3.2:3b) | IA local | Self-hosted |
| Tailscale Funnel | Túnel HTTPS homelab | Gratis |
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

*[Hub personal](https://joseangelhub.miniserver.online/) · [GitHub](https://github.com/joseangelalejo) · [Documentación](https://joseangelalejo.github.io/yukiko/) · [Panel web](https://yukiko.miniserver.online)*
