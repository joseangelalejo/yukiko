#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# yukiko-final.sh
# Limpieza total de WhatsApp del monorepo, módulo música, README/docs, PM2 fix
# Sin commits ni PRs. Genera ~/yukiko-final-diag.txt al terminar.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

REPO="$HOME/docker-compose-files/yukiko"
DIAG="$HOME/yukiko-final-diag.txt"
ERRORS=()
LOG=()

log()  { echo "[OK]  $*"; LOG+=("[OK]  $*"); }
warn() { echo "[WARN] $*"; LOG+=("[WARN] $*"); }
fail() { echo "[ERR] $*"; ERRORS+=("[ERR] $*"); }

write_diag() {
  {
    echo "═══════════════════════════════════════"
    echo " yukiko-final — diagnóstico"
    echo " $(date '+%Y-%m-%d %H:%M:%S')"
    echo "═══════════════════════════════════════"
    echo ""
    echo "── Log completo ──────────────────────"
    for l in "${LOG[@]}"; do echo "$l"; done
    echo ""
    echo "── Errores ───────────────────────────"
    if [ ${#ERRORS[@]} -eq 0 ]; then
      echo "Ninguno ✅"
    else
      for e in "${ERRORS[@]}"; do echo "$e"; done
    fi
    echo ""
    echo "── Estado PM2 ────────────────────────"
    pm2 list 2>&1 || echo "(pm2 no disponible)"
    echo ""
    echo "── Git status ────────────────────────"
    cd "$REPO" && git status && git log --oneline -5
    echo ""
    echo "── Referencias WhatsApp residuales ───"
    grep -rn "whatsapp\|WhatsApp\|baileys\|Baileys" "$REPO" \
      --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" \
      --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=".git" \
      --exclude-dir=sessions --exclude="*.bak" 2>/dev/null | grep -v "DEPRECATED" || echo "Ninguna ✅"
    echo ""
    echo "── Espacio en disco ──────────────────"
    df -h /
  } > "$DIAG"
  echo ""
  echo "📄 Diagnóstico guardado en: $DIAG"
}

trap 'write_diag' EXIT
cd "$REPO"
log "Directorio: $REPO"

# ═════════════════════════════════════════════════════════════
# BLOQUE 1 — PM2: parar yukiko-whatsapp, registrar yukiko-mobile
# ═════════════════════════════════════════════════════════════

# Parar y borrar yukiko-whatsapp de PM2
if pm2 show yukiko-whatsapp &>/dev/null; then
  pm2 delete yukiko-whatsapp 2>&1 && log "PM2: yukiko-whatsapp eliminado ✓" || fail "PM2: no se pudo eliminar yukiko-whatsapp"
else
  log "PM2: yukiko-whatsapp ya no estaba registrado"
fi

# Registrar yukiko-mobile si no existe
if ! pm2 show yukiko-mobile &>/dev/null; then
  pm2 start ecosystem.config.cjs --only yukiko-mobile 2>&1 \
    && log "PM2: yukiko-mobile iniciado ✓" \
    || fail "PM2: no se pudo iniciar yukiko-mobile"
else
  log "PM2: yukiko-mobile ya estaba registrado"
fi

pm2 save 2>&1 && log "PM2: estado guardado (pm2 save) ✓" || warn "PM2: pm2 save falló (no crítico)"

# ═════════════════════════════════════════════════════════════
# BLOQUE 2 — core/src/types.ts: Platform mobile, quitar whatsapp
# ═════════════════════════════════════════════════════════════

python3 << 'PYEOF'
path = '/home/dockerja/docker-compose-files/yukiko/core/src/types.ts'
with open(path) as f:
    content = f.read()

original = content

# Platform type
content = content.replace(
    "export type Platform = 'discord' | 'telegram' | 'whatsapp';",
    "export type Platform = 'discord' | 'telegram' | 'mobile';"
)
# Comentario en CommandContext
content = content.replace(
    "// ID de la plataforma (discord snowflake / telegram id / wa jid)",
    "// ID de la plataforma (discord snowflake / telegram id / mobile uuid)"
)

if content != original:
    with open(path, 'w') as f:
        f.write(content)
    print("OK: core/src/types.ts actualizado")
else:
    print("SKIP: core/src/types.ts ya estaba limpio")
PYEOF
log "core/src/types.ts: Platform whatsapp → mobile ✓"

# ═════════════════════════════════════════════════════════════
# BLOQUE 3 — modules/link/index.ts: quitar whatsapp de PLATFORM_NAMES/EMOJIS
#            y de todos los platforms arrays
# ═════════════════════════════════════════════════════════════

python3 << 'PYEOF'
path = '/home/dockerja/docker-compose-files/yukiko/modules/link/index.ts'
with open(path) as f:
    content = f.read()

original = content

content = content.replace(
    "const PLATFORM_NAMES: Record<Platform, string> = {\n  discord: 'Discord',\n  telegram: 'Telegram',\n  whatsapp: 'WhatsApp',\n};",
    "const PLATFORM_NAMES: Record<Platform, string> = {\n  discord: 'Discord',\n  telegram: 'Telegram',\n  mobile: 'Mobile',\n};"
)
content = content.replace(
    "const PLATFORM_EMOJIS: Record<Platform, string> = {\n  discord: '💜',\n  telegram: '🔵',\n  whatsapp: '💚',\n};",
    "const PLATFORM_EMOJIS: Record<Platform, string> = {\n  discord: '💜',\n  telegram: '🔵',\n  mobile: '📱',\n};"
)
# platforms arrays en los comandos
content = content.replace("platforms: ['discord', 'telegram', 'whatsapp'],", "platforms: ['discord', 'telegram', 'mobile'],")
# Texto del onboarding
content = content.replace("(Discord, Telegram o WhatsApp)", "(Discord, Telegram o Mobile)")
content = content.replace("(Discord, Telegram y Mobile).", "(Discord, Telegram o Mobile).")
# texto de link sin código
content = content.replace(
    "`(Discord, Telegram y WhatsApp).\\n\\n`",
    "`(Discord, Telegram y Mobile).\\n\\n`"
)

if content != original:
    with open(path, 'w') as f:
        f.write(content)
    print("OK: modules/link/index.ts actualizado")
else:
    print("SKIP: modules/link/index.ts ya estaba limpio")
PYEOF
log "modules/link/index.ts: whatsapp → mobile en PLATFORM_NAMES/EMOJIS/platforms ✓"

# ═════════════════════════════════════════════════════════════
# BLOQUE 4 — Todos los módulos: quitar 'whatsapp' de platforms arrays
# ═════════════════════════════════════════════════════════════

python3 << 'PYEOF'
import os, glob

base = '/home/dockerja/docker-compose-files/yukiko/modules'
files = glob.glob(f'{base}/*/index.ts')
changed_files = []

for path in files:
    with open(path) as f:
        content = f.read()
    original = content
    content = content.replace("platforms: ['discord', 'telegram', 'whatsapp'],", "platforms: ['discord', 'telegram', 'mobile'],")
    content = content.replace("platforms: ['discord', 'telegram', 'whatsapp', 'mobile'],", "platforms: ['discord', 'telegram', 'mobile'],")
    if content != original:
        with open(path, 'w') as f:
            f.write(content)
        changed_files.append(os.path.basename(os.path.dirname(path)))

if changed_files:
    print(f"OK: módulos actualizados: {', '.join(changed_files)}")
else:
    print("SKIP: todos los módulos ya estaban limpios")
PYEOF
log "modules/*/index.ts: platforms arrays actualizados ✓"

# ═════════════════════════════════════════════════════════════
# BLOQUE 5 — Borrar platforms/whatsapp/ (carpeta completa)
# ═════════════════════════════════════════════════════════════

if [ -d "$REPO/platforms/whatsapp" ]; then
  rm -rf "$REPO/platforms/whatsapp"
  log "platforms/whatsapp/: carpeta eliminada ✓"
else
  log "platforms/whatsapp/: ya no existía"
fi

# Borrar también sessions/whatsapp si existe
if [ -d "$REPO/sessions/whatsapp" ]; then
  rm -rf "$REPO/sessions/whatsapp"
  log "sessions/whatsapp/: sesiones eliminadas ✓"
else
  log "sessions/whatsapp/: ya no existía"
fi

# ═════════════════════════════════════════════════════════════
# BLOQUE 6 — modules/music: añadir al registro de Discord y Telegram
# ═════════════════════════════════════════════════════════════

# Añadir musicCommands al registro de Discord
python3 << 'PYEOF'
path = '/home/dockerja/docker-compose-files/yukiko/platforms/discord/src/index.ts'
with open(path) as f:
    content = f.read()

original = content

if 'musicCommands' not in content:
    content = content.replace(
        "import { linkCommands, handleNewUser, buildOnboardingMessage } from '@yukiko/link';",
        "import { linkCommands, handleNewUser, buildOnboardingMessage } from '@yukiko/link';\nimport { musicCommands } from '@yukiko/music';"
    )
    content = content.replace(
        "  ...linkCommands,           // ← nuevo",
        "  ...linkCommands,\n  ...musicCommands,"
    )
    # también en withArgs añadir play, skip, stop, queue
    content = content.replace(
        "      'hentai', 'gif18',",
        "      'hentai', 'gif18',\n      'play', 'skip',"
    )
    with open(path, 'w') as f:
        f.write(content)
    print("OK: platforms/discord/src/index.ts: musicCommands añadido")
else:
    print("SKIP: musicCommands ya estaba en Discord")
PYEOF
log "platforms/discord/src/index.ts: musicCommands registrado ✓"

# Añadir musicCommands al registro de Telegram
python3 << 'PYEOF'
path = '/home/dockerja/docker-compose-files/yukiko/platforms/telegram/src/index.ts'
with open(path) as f:
    content = f.read()

original = content

if 'musicCommands' not in content:
    content = content.replace(
        "import { linkCommands, handleNewUser, buildOnboardingMessage } from '@yukiko/link';",
        "import { linkCommands, handleNewUser, buildOnboardingMessage } from '@yukiko/link';\nimport { musicCommands } from '@yukiko/music';"
    )
    content = content.replace(
        "  ...linkCommands,           // ← nuevo",
        "  ...linkCommands,\n  ...musicCommands,"
    )
    with open(path, 'w') as f:
        f.write(content)
    print("OK: platforms/telegram/src/index.ts: musicCommands añadido")
else:
    print("SKIP: musicCommands ya estaba en Telegram")
PYEOF
log "platforms/telegram/src/index.ts: musicCommands registrado ✓"

# Añadir package.json de music al workspace raíz si no está
python3 << 'PYEOF'
import json
path = '/home/dockerja/docker-compose-files/yukiko/package.json'
with open(path) as f:
    pkg = json.load(f)

workspaces = pkg.get('workspaces', [])
if 'modules/music' not in workspaces:
    workspaces.append('modules/music')
    pkg['workspaces'] = workspaces
    with open(path, 'w') as f:
        json.dump(pkg, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print("OK: modules/music añadido a workspaces en package.json")
else:
    print("SKIP: modules/music ya estaba en workspaces")
PYEOF
log "package.json: modules/music en workspaces ✓"

# ═════════════════════════════════════════════════════════════
# BLOQUE 7 — README.md actualizado
# ═════════════════════════════════════════════════════════════

cat > "$REPO/README.md" << 'ENDREADME'
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
| **Web Chat** | ✅ ONLINE | [yukiko.miniserver.online/chat](https://yukiko.miniserver.online/chat) |
| **Web (Next.js)** | ✅ ONLINE | [yukiko.vercel.app](https://yukiko.vercel.app) · [yukiko.miniserver.online](https://yukiko.miniserver.online) |
| **Admin dashboard** | ✅ ONLINE | [yukiko.miniserver.online/admin](https://yukiko.miniserver.online/admin) |
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

Disponible en [yukiko.miniserver.online/chat](https://yukiko.miniserver.online/chat)

Interfaz de chat estilo ChatGPT que conecta con el homelab via API Route de Next.js → agente en puerto 3001.

**Comandos disponibles:**
- `/ask <pregunta>` — IA con Ollama (llama3.2:3b)
- `/imagine <descripción>` — Generación de imágenes con Pollinations.ai
- `/translate <idioma> <texto>` — Traducción automática via IA
- `/help` — Lista de comandos
- Texto libre → tratado automáticamente como `/ask`

---

## 📊 Panel de Administración

Disponible en [yukiko.miniserver.online/admin](https://yukiko.miniserver.online/admin)

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

*[Hub personal](https://joseangelhub.miniserver.online/) · [GitHub](https://github.com/joseangelalejo) · [Documentación](https://joseangelalejo.github.io/yukiko/) · [Panel web](https://yukiko.miniserver.online)*
ENDREADME
log "README.md: actualizado ✓"

# ═════════════════════════════════════════════════════════════
# BLOQUE 8 — npm install (actualizar lockfile tras cambios en workspaces)
# ═════════════════════════════════════════════════════════════

log "Ejecutando npm install (puede tardar ~30s)..."
cd "$REPO"
npm install --silent 2>&1 && log "npm install: completado ✓" || fail "npm install: falló — revisar package.json"

# ═════════════════════════════════════════════════════════════
# BLOQUE 9 — Reiniciar todos los bots para cargar módulo música
# ═════════════════════════════════════════════════════════════

for proc in yukiko-discord yukiko-telegram yukiko-mobile; do
  if pm2 show "$proc" &>/dev/null; then
    pm2 restart "$proc" --update-env 2>&1 \
      && log "PM2: $proc reiniciado ✓" \
      || fail "PM2: fallo al reiniciar $proc"
  else
    warn "PM2: $proc no encontrado, saltando restart"
  fi
done

# ═════════════════════════════════════════════════════════════
# Resumen
# ═════════════════════════════════════════════════════════════
echo ""
echo "─────────────────────────────────────"
if [ ${#ERRORS[@]} -eq 0 ]; then
  echo "✅ Todo OK — sin errores"
else
  echo "⚠️  Completado con ${#ERRORS[@]} error(es) — revisa $DIAG"
fi
echo "─────────────────────────────────────"
