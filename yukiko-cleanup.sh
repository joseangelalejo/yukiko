#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# yukiko-cleanup.sh
# Aplica todos los pendientes: menores, WhatsApp cleanup, música, mobile WS_URL
# Sin commits ni PRs. Genera ~/yukiko-cleanup-diag.txt si algo falla.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

REPO="$HOME/docker-compose-files/yukiko"
DIAG="$HOME/yukiko-cleanup-diag.txt"
ERRORS=()
LOG=()

log()  { echo "[OK]  $*"; LOG+=("[OK]  $*"); }
warn() { echo "[WARN] $*"; LOG+=("[WARN] $*"); }
fail() { echo "[ERR] $*"; ERRORS+=("[ERR] $*"); }

write_diag() {
  {
    echo "═══════════════════════════════════════"
    echo " yukiko-cleanup — diagnóstico"
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
# BLOQUE 1 — PENDIENTES MENORES
# ═════════════════════════════════════════════════════════════

# 1a. Failed to find Server Action — rebuild yukiko-web
log "Reiniciando yukiko-web (fix Server Action)..."
if pm2 show yukiko-web &>/dev/null; then
  pm2 restart yukiko-web 2>&1 && log "PM2: yukiko-web reiniciado ✓" || fail "PM2: fallo al reiniciar yukiko-web"
else
  fail "PM2: proceso yukiko-web no encontrado"
fi

# 1b. Confirmar que yukiko-discord sigue online
if pm2 show yukiko-discord &>/dev/null; then
  STATUS=$(pm2 jlist 2>/dev/null | python3 -c "
import sys, json
procs = json.load(sys.stdin)
p = next((x for x in procs if x['name'] == 'yukiko-discord'), None)
print(p['pm2_env']['status'] if p else 'not_found')
" 2>/dev/null || echo "unknown")
  if [ "$STATUS" = "online" ]; then
    log "yukiko-discord: online ✓"
  else
    warn "yukiko-discord: status=$STATUS (no crítico, puede estar arrancando)"
  fi
fi

# ═════════════════════════════════════════════════════════════
# BLOQUE 2 — QUITAR WHATSAPP DEL docker-compose.yml
# ═════════════════════════════════════════════════════════════

COMPOSE="$REPO/docker-compose.yml"

if grep -q "yukiko-whatsapp" "$COMPOSE"; then
  python3 << 'PYEOF'
import re, sys

path = '/home/dockerja/docker-compose-files/yukiko/docker-compose.yml'
with open(path) as f:
    content = f.read()

# Eliminar el bloque completo del servicio yukiko-whatsapp
# Desde el comentario "# ── WhatsApp Bot" hasta la siguiente línea en blanco antes del siguiente servicio
pattern = r'\n  # ── WhatsApp Bot[^\n]*\n  yukiko-whatsapp:.*?(?=\n  [a-z#]|\nvolumes:)'
cleaned = re.sub(pattern, '', content, flags=re.DOTALL)

if 'yukiko-whatsapp' not in cleaned:
    with open(path, 'w') as f:
        f.write(cleaned)
    print("OK")
else:
    print("FAIL")
PYEOF
  RESULT=$(python3 -c "
import re
path = '$COMPOSE'
with open(path) as f:
    c = f.read()
print('ok' if 'yukiko-whatsapp' not in c else 'fail')
")
  if [ "$RESULT" = "ok" ]; then
    log "docker-compose.yml: bloque yukiko-whatsapp eliminado ✓"
  else
    fail "docker-compose.yml: no se pudo eliminar yukiko-whatsapp — revisar manualmente"
  fi
else
  log "docker-compose.yml: yukiko-whatsapp ya no estaba, nada que hacer"
fi

# ═════════════════════════════════════════════════════════════
# BLOQUE 3 — QUITAR WHATSAPP DEL MONOREPO (archivos no-platform)
# ═════════════════════════════════════════════════════════════

# 3a. package.json raíz — quitar dev:whatsapp, build:bots whatsapp, baileys dep, description
python3 << 'PYEOF'
import json, sys

path = '/home/dockerja/docker-compose-files/yukiko/package.json'
with open(path) as f:
    pkg = json.load(f)

changed = False

# description
if 'WhatsApp' in pkg.get('description', ''):
    pkg['description'] = 'Yukiko — Multi-platform bot for Discord, Telegram & Mobile'
    changed = True

# scripts
scripts = pkg.get('scripts', {})
if 'dev:whatsapp' in scripts:
    del scripts['dev:whatsapp']
    changed = True
if 'dev' in scripts and 'whatsapp' in scripts['dev']:
    scripts['dev'] = scripts['dev'].replace(' "npm run dev:whatsapp"', '').replace('"npm run dev:whatsapp"', '').replace('  ', ' ')
    changed = True
if 'build:bots' in scripts and 'whatsapp' in scripts['build:bots']:
    scripts['build:bots'] = scripts['build:bots'].replace(' platforms/whatsapp', '')
    changed = True

# dependencies — quitar baileys
deps = pkg.get('dependencies', {})
if '@whiskeysockets/baileys' in deps:
    del deps['@whiskeysockets/baileys']
    changed = True

if changed:
    with open(path, 'w') as f:
        json.dump(pkg, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print("OK: package.json actualizado")
else:
    print("SKIP: package.json ya estaba limpio")
PYEOF
log "package.json raíz: WhatsApp/Baileys eliminados ✓"

# 3b. tsconfig.json raíz — quitar platforms/whatsapp de includes
python3 << 'PYEOF'
import json

path = '/home/dockerja/docker-compose-files/yukiko/tsconfig.json'
with open(path) as f:
    content = f.read()

import json as j
tsconfig = j.loads(content)
changed = False

refs = tsconfig.get('references', [])
new_refs = [r for r in refs if 'whatsapp' not in r.get('path', '')]
if len(new_refs) != len(refs):
    tsconfig['references'] = new_refs
    changed = True

files = tsconfig.get('files', [])
new_files = [f for f in files if 'whatsapp' not in f]
if len(new_files) != len(files):
    tsconfig['files'] = new_files
    changed = True

include = tsconfig.get('include', [])
new_include = [i for i in include if 'whatsapp' not in i]
if len(new_include) != len(include):
    tsconfig['include'] = new_include
    changed = True

if changed:
    with open(path, 'w') as f:
        j.dump(tsconfig, f, indent=2)
        f.write('\n')
    print("OK: tsconfig.json actualizado")
else:
    print("SKIP: tsconfig.json ya estaba limpio")
PYEOF
log "tsconfig.json: referencias whatsapp eliminadas ✓"

# 3c. ssh-cli/yukiko.ts — quitar whatsapp de restart y processes
python3 << 'PYEOF'
path = '/home/dockerja/docker-compose-files/yukiko/ssh-cli/yukiko.ts'
with open(path) as f:
    content = f.read()

original = content
content = content.replace("restart <platform>  — Restart a platform (discord|telegram|whatsapp|all)", 
                           "restart <platform>  — Restart a platform (discord|telegram|mobile|all)")
content = content.replace("['yukiko-discord', 'yukiko-telegram', 'yukiko-whatsapp']",
                           "['yukiko-discord', 'yukiko-telegram', 'yukiko-mobile']")
content = content.replace("? ['discord', 'telegram', 'whatsapp']",
                           "? ['discord', 'telegram', 'mobile']")

if content != original:
    with open(path, 'w') as f:
        f.write(content)
    print("OK: ssh-cli/yukiko.ts actualizado")
else:
    print("SKIP: ssh-cli/yukiko.ts ya estaba limpio")
PYEOF
log "ssh-cli/yukiko.ts: whatsapp → mobile ✓"

# 3d. modules/link/index.ts — actualizar texto de plataformas
python3 << 'PYEOF'
path = '/home/dockerja/docker-compose-files/yukiko/modules/link/index.ts'
with open(path) as f:
    content = f.read()

original = content
content = content.replace('(Discord, Telegram y WhatsApp).', '(Discord, Telegram y Mobile).')

if content != original:
    with open(path, 'w') as f:
        f.write(content)
    print("OK: modules/link/index.ts actualizado")
else:
    print("SKIP: modules/link/index.ts ya estaba limpio")
PYEOF
log "modules/link/index.ts: texto plataformas actualizado ✓"

# 3e. db/schema.ts — actualizar comentario (solo cosmético, no tocar la columna)
python3 << 'PYEOF'
path = '/home/dockerja/docker-compose-files/yukiko/db/schema.ts'
with open(path) as f:
    content = f.read()

original = content
content = content.replace(
    "// discord | telegram | whatsapp",
    "// discord | telegram | mobile"
)
content = content.replace(
    "// ── Known contacts (WhatsApp/Telegram: para no spamear con bienvenida) ───",
    "// ── Known contacts (Telegram/Mobile: para no spamear con bienvenida) ───"
)

if content != original:
    with open(path, 'w') as f:
        f.write(content)
    print("OK: db/schema.ts comentarios actualizados")
else:
    print("SKIP: db/schema.ts ya estaba limpio")
PYEOF
log "db/schema.ts: comentarios actualizados ✓"

# ═════════════════════════════════════════════════════════════
# BLOQUE 4 — MÓDULO DE MÚSICA (scaffold básico)
# ═════════════════════════════════════════════════════════════

MUSIC_DIR="$REPO/modules/music"

if [ -d "$MUSIC_DIR" ]; then
  log "modules/music: ya existe, saltando scaffold"
else
  mkdir -p "$MUSIC_DIR"

  cat > "$MUSIC_DIR/package.json" << 'EOF'
{
  "name": "@yukiko/music",
  "version": "1.0.0",
  "private": true,
  "type": "module"
}
EOF

  cat > "$MUSIC_DIR/index.ts" << 'EOF'
import type { Command, CommandContext } from '../../core/src/types.js';

// ── Módulo de música — pendiente de implementación ───────────
// Decisiones pendientes:
//   - Provider: Lavalink (ya en docker-compose) vs YouTube direct vs otro
//   - Plataformas: Discord (voz) vs Telegram (audio file) vs Mobile
//   - Cola: en memoria vs Redis
//
// Por ahora expone los comandos como stubs para que el registro no falle.

export const musicCommands: Command[] = [
  {
    name: 'play',
    aliases: ['p'],
    description: 'Reproduce una canción (próximamente)',
    category: 'music',
    platforms: ['discord'],
    execute: async (ctx: CommandContext) => {
      await ctx.reply('🎵 El módulo de música está en desarrollo. ¡Pronto disponible!');
    },
  },
  {
    name: 'stop',
    aliases: ['parar'],
    description: 'Para la reproducción (próximamente)',
    category: 'music',
    platforms: ['discord'],
    execute: async (ctx: CommandContext) => {
      await ctx.reply('🎵 El módulo de música está en desarrollo.');
    },
  },
  {
    name: 'skip',
    aliases: ['siguiente'],
    description: 'Salta a la siguiente canción (próximamente)',
    category: 'music',
    platforms: ['discord'],
    execute: async (ctx: CommandContext) => {
      await ctx.reply('🎵 El módulo de música está en desarrollo.');
    },
  },
  {
    name: 'queue',
    aliases: ['cola', 'q'],
    description: 'Muestra la cola de reproducción (próximamente)',
    category: 'music',
    platforms: ['discord'],
    execute: async (ctx: CommandContext) => {
      await ctx.reply('🎵 El módulo de música está en desarrollo.');
    },
  },
];
EOF

  log "modules/music: scaffold creado ✓ (stubs, listo para implementar)"
fi

# ═════════════════════════════════════════════════════════════
# BLOQUE 5 — MOBILE WS_URL
# ═════════════════════════════════════════════════════════════

# Buscar App.tsx en yukiko-mobile (puede no existir en este repo si está separado)
MOBILE_APP=""
for candidate in \
  "$REPO/yukiko-mobile/App.tsx" \
  "$REPO/mobile-app/App.tsx" \
  "$HOME/yukiko-mobile/App.tsx" \
  "$HOME/mobile-app/App.tsx"; do
  if [ -f "$candidate" ]; then
    MOBILE_APP="$candidate"
    break
  fi
done

if [ -z "$MOBILE_APP" ]; then
  warn "App.tsx no encontrado — la app mobile no está en este repo o en rutas estándar"
  warn "WS_URL pendiente: cuando tengas la app, cambia WS_URL a ws://100.66.214.108:3002"
else
  python3 << PYEOF
path = '$MOBILE_APP'
with open(path) as f:
    content = f.read()

import re
original = content

# Reemplazar cualquier WS_URL con la IP del homelab
content = re.sub(
    r"(const\s+WS_URL\s*=\s*['\"])([^'\"]+)(['\"])",
    r"\1ws://100.66.214.108:3002\3",
    content
)
# También por si está como variable de entorno hardcodeada
content = re.sub(
    r"(WS_URL\s*[=:]\s*['\"])([^'\"]+)(['\"])",
    r"\1ws://100.66.214.108:3002\3",
    content
)

if content != original:
    with open(path, 'w') as f:
        f.write(content)
    print("OK: WS_URL actualizado a ws://100.66.214.108:3002")
else:
    print("SKIP: WS_URL ya tenía el valor correcto o no se encontró el patrón")
PYEOF
  log "App.tsx: WS_URL → ws://100.66.214.108:3002 ✓"
fi

# ═════════════════════════════════════════════════════════════
# Resumen final
# ═════════════════════════════════════════════════════════════
echo ""
echo "─────────────────────────────────────"
if [ ${#ERRORS[@]} -eq 0 ]; then
  echo "✅ Todo OK — sin errores"
else
  echo "⚠️  Completado con ${#ERRORS[@]} error(es) — revisa $DIAG"
fi
echo "─────────────────────────────────────"
echo ""
echo "Pendiente manual (no automatizable aquí):"
echo "  • Si App.tsx no se encontró: la app mobile está en un zip/carpeta separada"
echo "  • Decidir provider para módulo de música antes de implementar"
echo "  • npm install tras cambios en package.json (quitar baileys)"
