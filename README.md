<div align="center">
  <img src="yukiko-banner-github.png" alt="Yukiko Bot Banner" width="100%" />
  <br/><br/>
  <img src="yukiko-logo-128.png" alt="Yukiko Logo" width="80" style="border-radius:50%;" />

  <h1>Yukiko Bot</h1>
  <p><em>Tu compañera neko kawaii multiplataforma — Discord, Telegram &amp; WhatsApp</em></p>

  [![Deploy Docs](https://github.com/joseangelalejo/yukiko/actions/workflows/deploy.yml/badge.svg)](https://github.com/joseangelalejo/yukiko/actions)
  [![GitHub Pages](https://img.shields.io/badge/docs-live-pink?logo=github)](https://joseangelalejo.github.io/yukiko/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
  [![Node.js 20+](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://typescriptlang.org)
</div>

---

## � Estado Actual

| Componente | Status | Detalles |
|---|---|---|
| **Servidor (your-homelab-ip)** | ✅ ONLINE | 5/5 procesos PM2 corriendo |
| **Discord** | ✅ ONLINE | Yukiko#3557 (slash commands ready) |
| **Telegram** | ✅ ONLINE | @YukikoNeko_bot |
| **WhatsApp** | ✅ ONLINE | Conectado con sesión activa |
| **Web (Next.js)** | ✅ ONLINE | Admin dashboard en puerto 3000 |
| **Base de Datos** | ✅ READY | Neon PostgreSQL (cooldowns, knownContacts) |
| **Build Status** | ✅ SUCCESS | TypeScript compilado sin errores (18:46 GMT) |
| **Última actualización** | ✅ 12 mar 2026 | Commit a1e701d |

---

## 📖 Documentación

**[→ joseangelalejo.github.io/yukiko](https://joseangelalejo.github.io/yukiko/)**

Guía visual con todos los comandos, configuración por plataforma, stack tecnológico y más.

Para la guía completa de configuración paso a paso:
**[→ docs/PLATFORM_SETUP.md](docs/PLATFORM_SETUP.md)**

📋 **Documentación interna:**
- [INFORME_SESION.txt](INFORME_SESION.txt) — Estado actual y histórico detallado
- [SIGUIENTES_PASOS.txt](SIGUIENTES_PASOS.txt) — Instrucciones paso a paso para servidor
- [INDICE_DOCUMENTACION.txt](INDICE_DOCUMENTACION.txt) — Índice completo de docs

---

## ✨ Módulos

| Módulo | Comandos | Discord | Telegram | WhatsApp |
|---|---|:---:|:---:|:---:|
| 🎭 Roleplay | hug, kiss, pat, slap, dance, +8 más | ✅ | ✅ | ✅ |
| 💰 Economía | balance, daily, transfer, top, shop, pet | ✅ | ✅ | ✅ |
| 🤖 IA | ask, imagine, rp, translate | ✅ | ✅ | ✅ |
| 🔨 Moderación | warn, ban, clear, prefix, stats | ✅ | ✅ | ✅ |
| 🔞 +18 | hentai, redgifs, adult on/off, verify18 | ✅ | ✅ | ✅ |
| 🎵 Música | play, queue, skip, pause, volume | ✅ | — | — |

---

## 🚀 Instalación rápida

### Arch Linux

```bash
git clone git@github.com:joseangelalejo/yukiko.git
cd yukiko
bash scripts/install-arch.sh   # instala todas las dependencias
cp .env.example .env            # edita con tus tokens
npm install
npx drizzle-kit push            # crea tablas en Neon
npm run dev                     # arranca todo
```

### Windows

```powershell
# PowerShell como Administrador:
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
│   ├── discord/    # Discord.js — slash commands, música
│   ├── telegram/   # Grammy — BotFather integration
│   └── whatsapp/   # Baileys — protocolo WA Web, QR auth
├── modules/
│   ├── roleplay/   # GIFs via Tenor API
│   ├── economy/    # Monedas, niveles, mascotas, matrimonios
│   ├── adult/      # Danbooru + RedGifs con verificación +18
│   ├── ai/         # GPT-4o + DALL-E 3
│   └── moderation/ # Warn, ban, logs
├── web/            # Next.js → Vercel (landing + admin + monitor)
├── db/             # Drizzle ORM schema → Neon PostgreSQL
├── ssh-cli/        # CLI remota para gestionar desde Arch
├── docker/         # Dockerfiles, Prometheus, Lavalink config
├── scripts/        # install-arch.sh, install-windows.ps1/py, dev.sh...
├── docs/           # GitHub Pages — esta documentación
└── .github/        # CI/CD: lint → Vercel + SSH homelab + Pages
```

---

## 🐳 Docker (producción)

```bash
# Todo el stack (bots + Redis + Lavalink + Prometheus + Grafana)
docker-compose up -d

# Solo bots
docker-compose up -d yukiko-discord yukiko-telegram yukiko-whatsapp redis

# Logs
docker-compose logs -f yukiko-discord
```

---

## 🖥️ Deploy en homelab con PM2 (ACTUAL)

```bash
# ✅ Servidor producción (your-homelab-ip)
sssh dockerja@your-homelab-ip

# Ver estado
pm2 list
pm2 logs --lines 50

# Después de pull de cambios:
git pull origin main
npm install              # Muy importante: reconoce nuevos workspaces
npm run build
pm2 restart all
```

**Flujo actual:**
1. **Local**: `git push origin main` → GitHub
2. **Server**: `git pull` + `npm install && npm run build && pm2 restart all`
3. **Web**: Deploy manual a Vercel desde `cd web && npx vercel --prod` (sin CI/CD aún)

**Próximo: CI/CD con GitHub Actions**
- Push a `main` → lint → Tests + Build validation → Auto-deploy bots (SSH) + web (Vercel)

---

## 🔧 SSH CLI

```bash
# Administra el bot desde tu Arch Linux
yukiko status                    # Estado de plataformas
yukiko restart discord           # Reiniciar Discord
yukiko restart all               # Reiniciar todo
yukiko logs telegram --tail      # Logs en tiempo real
yukiko users -n 10               # Ver últimos 10 usuarios
yukiko ban abc123 -r "Spam"      # Banear usuario
yukiko backup                    # Backup de BD
yukiko deploy                    # Deploy completo
```

---

## 📊 Panel de Administración

Disponible en `https://tu-dominio.vercel.app/admin`

- Estado de plataformas en tiempo real
- Gestión de usuarios y grupos
- Aprobar solicitudes +18 (`/admin/verifications`)
- Logs de comandos y métricas

---

## 🛠️ Stack (100% gratuito)

| Servicio | Uso | Plan |
|---|---|---|
| [Neon](https://neon.tech) | PostgreSQL serverless | Gratis |
| [Vercel](https://vercel.com) | Web (Next.js) | Gratis |
| GitHub Pages | Esta documentación | Gratis |
| GitHub Actions | CI/CD | Gratis |
| Tenor API | GIFs roleplay | Gratis |
| Danbooru | Imágenes +18 | Gratis |
| RedGifs | GIFs +18 | Gratis |
| Redis | Cache (Docker homelab) | Self-hosted |
| Lavalink | Música (Docker homelab) | Self-hosted |
| Grafana + Prometheus | Monitorización (homelab) | Self-hosted |
| Homelab Proxmox VE | Bots 24/7 (32 GB RAM DDR4) | Self-hosted |

---

## 🔞 Sistema de verificación +18

Múltiples capas de seguridad:

1. **Solo en grupos** — No funciona en privado
2. **Activación por admin** — `/adult on` solo lo puede ejecutar un admin del grupo
3. **Verificación de edad** — Cada usuario debe usar `/verify18` y el bot admin aprueba desde el panel web
4. **Logs completos** — Todos los accesos quedan registrados en la BD

---

## 📝 License

MIT © [joseangelalejo](https://github.com/joseangelalejo)

---

## 🔄 Último Deployment

**Fecha**: 12 de marzo 2026 @ 18:46 GMT  
**Servidor**: your-homelab-ip (dockerja)  
**Commit**: a1e701d (Build exitoso + 5 procesos ONLINE)  
**Fix aplicado**: Workspace @yukiko/db reconocido (commit 8dbfc9d)

**Validaciones:**
- ✅ npm run build sin errores  
- ✅ TypeScript compilation OK  
- ✅ Todos los bots conectados  
- ✅ Base de datos sincronizada  

---

*[Hub personal](https://your-domain.com/) · [GitHub](https://github.com/joseangelalejo) · [Documentación](https://joseangelalejo.github.io/yukiko/) · [Estado en vivo](https://your-homelab-ip:3000)*
