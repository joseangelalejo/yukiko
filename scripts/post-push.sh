#!/usr/bin/env bash
# =============================================================================
# 🌨️  YUKIKO — Post-push: verificar deploy + informe
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source .env 2>/dev/null || true

REPORT_DIR="$ROOT_DIR/logs/reports"
mkdir -p "$REPORT_DIR"
REPORT_FILE="$REPORT_DIR/post-push-$(date +%Y%m%d-%H%M%S).md"

log()     { echo "$*" | tee -a "$REPORT_FILE"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; log "- ✅ $*"; }
fail()    { echo -e "${RED}[FAIL]${RESET}  $*"; log "- ❌ $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; log "- ⚠️  $*"; }
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; log "- ℹ️  $*"; }
step()    { echo -e "\n${BOLD}${BLUE}▶ $*${RESET}"; log "\n## $*"; }

BRANCH=$(git branch --show-current)
COMMIT=$(git log --oneline -1)
PUSH_TIME=$(date '+%Y-%m-%d %H:%M:%S')

cat > "$REPORT_FILE" << EOF
# 🌨️ Yukiko — Informe Post-Push
**Fecha:** $PUSH_TIME
**Rama:** $BRANCH
**Commit:** $COMMIT

EOF

echo -e "\n${BOLD}🌨️  Yukiko — Post-Push Verification${RESET}\n"

# ── 1. GitHub Actions status ──────────────────────────────────────────────────
step "Estado de GitHub Actions"
sleep 5  # dar tiempo al trigger

if command -v gh &>/dev/null; then
  info "Esperando que arranque el workflow (15s)..."
  sleep 15
  GH_STATUS=$(gh run list --limit 1 --json status,conclusion,name 2>/dev/null || echo "[]")
  RUN_STATUS=$(echo "$GH_STATUS" | jq -r '.[0].status // "unknown"' 2>/dev/null || echo "unknown")
  RUN_NAME=$(echo "$GH_STATUS" | jq -r '.[0].name // "unknown"' 2>/dev/null || echo "unknown")
  info "Workflow '$RUN_NAME' — Estado: $RUN_STATUS"
  log "GitHub Actions: $RUN_STATUS"
  echo -e "  Ver en: ${CYAN}https://github.com/joseangelalejo/yukiko/actions${RESET}"
else
  warn "GitHub CLI (gh) no instalado. Instala con: sudo pacman -S github-cli"
  info "Verifica manualmente: https://github.com/joseangelalejo/yukiko/actions"
fi

# ── 2. Vercel deploy ──────────────────────────────────────────────────────────
step "Estado de Vercel"
VERCEL_URL="${APP_URL:-}"
if [[ -n "$VERCEL_URL" && "$VERCEL_URL" != "http://localhost:3000" ]]; then
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$VERCEL_URL" 2>/dev/null || echo "000")
  if [[ "$HTTP_STATUS" == "200" ]]; then
    success "Web accesible: $VERCEL_URL ($HTTP_STATUS)"
  else
    fail "Web devolvió: $HTTP_STATUS en $VERCEL_URL"
  fi

  # Ping endpoints
  for endpoint in "/api/monitor/metrics" "/api/admin/stats"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${VERCEL_URL}${endpoint}" 2>/dev/null || echo "000")
    if [[ "$STATUS" =~ ^(200|401|403)$ ]]; then
      success "Endpoint $endpoint — $STATUS"
    else
      warn "Endpoint $endpoint — $STATUS"
    fi
  done
else
  warn "APP_URL no configurada o es localhost — skip verificación Vercel"
fi

# ── 3. VPS bots ───────────────────────────────────────────────────────────────
step "Estado del VPS"
if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -i ~/.ssh/id_ed25519_github dockerja@100.66.214.108 true 2>/dev/null; then
  VPS_STATUS=$(ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519_github dockerja@100.66.214.108 "pm2 jlist 2>/dev/null" 2>/dev/null || echo "[]")
  for platform in discord telegram whatsapp; do
    STATUS=$(echo "$VPS_STATUS" | jq -r ".[] | select(.name == \"yukiko-$platform\") | .pm2_env.status" 2>/dev/null || echo "unknown")
    if [[ "$STATUS" == "online" ]]; then
      success "yukiko-$platform — online"
    elif [[ "$STATUS" == "unknown" ]]; then
      warn "yukiko-$platform — estado desconocido (¿pm2 configurado?)"
    else
      fail "yukiko-$platform — $STATUS"
    fi
  done
else
  warn "SSH_HOST no configurado — skip verificación VPS"
fi

# ── 4. Git estado post-push ───────────────────────────────────────────────────
step "Estado Git"
git log --oneline -3 | while read -r line; do info "$line"; done
AHEAD=$(git rev-list origin/$BRANCH..$BRANCH 2>/dev/null | wc -l || echo "?")
BEHIND=$(git rev-list $BRANCH..origin/$BRANCH 2>/dev/null | wc -l || echo "?")
info "Commits adelante de origin: $AHEAD | atrás: $BEHIND"

# ── 5. Changelog automático ───────────────────────────────────────────────────
step "Cambios en este push"
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [[ -n "$LAST_TAG" ]]; then
  info "Cambios desde $LAST_TAG:"
  git log "$LAST_TAG"..HEAD --oneline | while read -r line; do
    info "  $line"
    log "- $line"
  done
else
  info "Último commit: $COMMIT"
fi

# ── Resumen ───────────────────────────────────────────────────────────────────
cat >> "$REPORT_FILE" << EOF

---
**Push completado:** $PUSH_TIME
**Branch:** $BRANCH
**Commit:** $COMMIT
EOF

echo -e "\n${BOLD}────────────────────────────────────────────${RESET}"
echo -e "📄 Informe guardado: ${CYAN}$REPORT_FILE${RESET}"
echo -e "🔗 GitHub Actions:  ${CYAN}https://github.com/joseangelalejo/yukiko/actions${RESET}"
echo -e "${BOLD}────────────────────────────────────────────${RESET}\n"
