#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# yukiko-maintenance.sh
# Aplica fixes pendientes sin hacer commit ni PR.
# Si algo falla genera ~/yukiko-diag.txt con el diagnóstico completo.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

REPO="$HOME/projects/yukiko"
DIAG="$HOME/yukiko-diag.txt"
ERRORS=()
LOG=()

log()  { echo "[OK]  $*"; LOG+=("[OK]  $*"); }
fail() { echo "[ERR] $*"; ERRORS+=("[ERR] $*"); }

# ── Escribir diagnóstico y salir ──────────────────────────────
write_diag() {
  {
    echo "═══════════════════════════════════════"
    echo " yukiko-maintenance — diagnóstico"
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
    echo "── Variables Vercel relevantes ───────"
    vercel env ls 2>&1 | grep -E "HOMELAB|APP_URL|ADMIN" || echo "(vercel cli no disponible o sin salida)"
    echo ""
    echo "── Git status ────────────────────────"
    cd "$REPO" && git status && git log --oneline -5
  } > "$DIAG"
  echo ""
  echo "📄 Diagnóstico guardado en: $DIAG"
}

trap 'write_diag' EXIT

cd "$REPO"
log "Directorio: $REPO"

# ─────────────────────────────────────────────────────────────
# 1. Fix platforms/discord/src/index.ts: redgifs → gif18
# ─────────────────────────────────────────────────────────────
DISCORD_INDEX="platforms/discord/src/index.ts"

if grep -q "'redgifs'" "$DISCORD_INDEX"; then
  sed -i "s/'hentai', 'redgifs'/'hentai', 'gif18'/" "$DISCORD_INDEX"
  if grep -q "'gif18'" "$DISCORD_INDEX" && ! grep -q "'redgifs'" "$DISCORD_INDEX"; then
    log "Discord withArgs: redgifs → gif18 ✓"
  else
    fail "Discord withArgs: sed ejecutado pero resultado inesperado"
  fi
else
  if grep -q "'gif18'" "$DISCORD_INDEX"; then
    log "Discord withArgs: ya tenía gif18, nada que hacer"
  else
    fail "Discord withArgs: no se encontró ni 'redgifs' ni 'gif18' — revisar manualmente"
  fi
fi

# ─────────────────────────────────────────────────────────────
# 2. Actualizar HOMELAB_AGENT_URL en Vercel
# ─────────────────────────────────────────────────────────────
if ! command -v vercel &>/dev/null; then
  fail "vercel CLI no encontrado — HOMELAB_AGENT_URL no actualizado"
else
  # Eliminar valor anterior y poner el nuevo en production
  NEW_URL="https://your-app-domain.com/agent"

  # Vercel CLI: remove primero (ignora error si no existía), luego add
  vercel env rm HOMELAB_AGENT_URL production --yes 2>/dev/null || true
  echo "$NEW_URL" | vercel env add HOMELAB_AGENT_URL production 2>&1
  if [ $? -eq 0 ]; then
    log "Vercel: HOMELAB_AGENT_URL → $NEW_URL ✓"
  else
    fail "Vercel: no se pudo actualizar HOMELAB_AGENT_URL"
  fi
fi

# ─────────────────────────────────────────────────────────────
# 3. yk-deploy (redeploy Vercel con las nuevas env vars)
# ─────────────────────────────────────────────────────────────
if ! command -v vercel &>/dev/null; then
  fail "vercel CLI no encontrado — yk-deploy saltado"
else
  log "Lanzando yk-deploy..."
  if bash "$REPO/scripts/vercel-deploy.sh" 2>&1; then
    log "yk-deploy completado ✓"
  else
    fail "yk-deploy falló — ver salida arriba"
  fi
fi

# ─────────────────────────────────────────────────────────────
# 4. Reiniciar yukiko-agent para que cargue el agent.ts nuevo
# ─────────────────────────────────────────────────────────────
if pm2 show yukiko-agent &>/dev/null; then
  pm2 restart yukiko-agent 2>&1 && log "PM2: yukiko-agent reiniciado ✓" || fail "PM2: fallo al reiniciar yukiko-agent"
else
  fail "PM2: proceso yukiko-agent no encontrado"
fi

# ─────────────────────────────────────────────────────────────
# Resumen en terminal
# ─────────────────────────────────────────────────────────────
echo ""
echo "─────────────────────────────────────"
if [ ${#ERRORS[@]} -eq 0 ]; then
  echo "✅ Todo OK — sin errores"
else
  echo "⚠️  Completado con ${#ERRORS[@]} error(es) — revisa $DIAG"
fi
echo "─────────────────────────────────────"
