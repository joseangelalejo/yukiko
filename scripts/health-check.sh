#!/usr/bin/env bash
# =============================================================================
# 🌨️  YUKIKO — Health Check completo
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source .env 2>/dev/null || true

ok()   { echo -e "  ${GREEN}●${RESET} $*"; }
fail() { echo -e "  ${RED}●${RESET} $*"; }
warn() { echo -e "  ${YELLOW}●${RESET} $*"; }
info() { echo -e "  ${CYAN}·${RESET} $*"; }

echo -e "\n${BOLD}🌨️  Yukiko Health Check — $(date '+%H:%M:%S')${RESET}\n"

# ── Sistema ────────────────────────────────────────────────────────────────
echo -e "${BOLD}Sistema${RESET}"
CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d. -f1 2>/dev/null || echo "?")
MEM_USED=$(free | awk '/^Mem:/{printf "%.0f", $3/$2 * 100}')
DISK_USED=$(df / | awk 'NR==2{print $5}' | tr -d '%')
LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ',')
UPTIME_STR=$(uptime -p 2>/dev/null || echo "?")

info "Uptime: $UPTIME_STR"
[[ "${CPU:-0}" -lt 80 ]] && ok "CPU: ${CPU}%" || fail "CPU alta: ${CPU}%"
[[ "${MEM_USED:-0}" -lt 85 ]] && ok "RAM: ${MEM_USED}%" || warn "RAM alta: ${MEM_USED}%"
[[ "${DISK_USED:-0}" -lt 85 ]] && ok "Disco: ${DISK_USED}%" || warn "Disco alto: ${DISK_USED}%"
info "Load: $LOAD"

# ── Servicios ─────────────────────────────────────────────────────────────
echo -e "\n${BOLD}Servicios locales${RESET}"
systemctl is-active --quiet redis && ok "Redis: activo" || warn "Redis: inactivo"
systemctl is-active --quiet docker && ok "Docker: activo" || warn "Docker: inactivo"
command -v pm2 &>/dev/null && ok "PM2: instalado" || warn "PM2: no instalado"

# ── Bots (pm2) ────────────────────────────────────────────────────────────
echo -e "\n${BOLD}Procesos del bot${RESET}"
if command -v pm2 &>/dev/null; then
  for platform in discord telegram whatsapp; do
    STATUS=$(pm2 jlist 2>/dev/null | jq -r ".[] | select(.name == \"yukiko-$platform\") | .pm2_env.status" 2>/dev/null || echo "not_found")
    if [[ "$STATUS" == "online" ]]; then
      UPTIME_MS=$(pm2 jlist 2>/dev/null | jq -r ".[] | select(.name == \"yukiko-$platform\") | .pm2_env.pm_uptime" 2>/dev/null || echo "0")
      ok "$platform: online"
    elif [[ "$STATUS" == "not_found" ]]; then
      warn "$platform: no registrado en pm2 (dev mode?)"
    else
      fail "$platform: $STATUS"
    fi
  done
else
  # Buscar procesos directamente
  for platform in discord telegram whatsapp; do
    pgrep -f "platforms/$platform" &>/dev/null && ok "$platform: proceso activo" || warn "$platform: sin proceso"
  done
fi

# ── Conectividad a APIs ────────────────────────────────────────────────────
echo -e "\n${BOLD}APIs externas${RESET}"
check_api() {
  local name="$1"; local url="$2"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
  if [[ "$code" =~ ^(200|401|403)$ ]]; then
    ok "$name: accesible ($code)"
  else
    fail "$name: $code — posible problema de conectividad"
  fi
}

check_api "Discord API"   "https://discord.com/api/v10/gateway"
check_api "Telegram API"  "https://api.telegram.org"
check_api "OpenAI API"    "https://api.openai.com"
check_api "Tenor API"     "https://tenor.googleapis.com"
check_api "RedGifs"       "https://api.redgifs.com/v2/auth/temporary"

# ── Base de datos ─────────────────────────────────────────────────────────
echo -e "\n${BOLD}Base de datos (Neon)${RESET}"
if [[ -n "${DATABASE_URL:-}" && "$DATABASE_URL" != *"xxxx"* ]]; then
  DB_RESULT=$(node -e "
    const { neon } = require('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    const start = Date.now();
    sql\`SELECT COUNT(*) as users FROM users\`
      .then(r => { console.log('ok:' + (Date.now()-start) + ':' + r[0].users); process.exit(0); })
      .catch(e => { console.log('err:' + e.message); process.exit(0); });
  " 2>/dev/null || echo "err:timeout")

  if [[ "$DB_RESULT" == ok:* ]]; then
    LATENCY=$(echo "$DB_RESULT" | cut -d: -f2)
    USERS=$(echo "$DB_RESULT" | cut -d: -f3)
    ok "Neon DB: conectado (${LATENCY}ms) | usuarios: $USERS"
  else
    fail "Neon DB: error de conexión"
  fi
else
  warn "DATABASE_URL no configurado"
fi

# ── Archivos críticos ─────────────────────────────────────────────────────
echo -e "\n${BOLD}Archivos críticos${RESET}"
CRITICAL_FILES=(
  ".env"
  "package.json"
  "db/schema.ts"
  "platforms/discord/src/index.ts"
  "platforms/telegram/src/index.ts"
  "platforms/whatsapp/src/index.ts"
)
for f in "${CRITICAL_FILES[@]}"; do
  [[ -f "$f" ]] && ok "$f" || fail "$f — FALTA"
done

# ── Sesión WhatsApp ───────────────────────────────────────────────────────
echo -e "\n${BOLD}Sesión WhatsApp${RESET}"
WA_SESSION="${WHATSAPP_SESSION_PATH:-./sessions/whatsapp}"
if [[ -d "$WA_SESSION" ]] && find "$WA_SESSION" -name "creds.json" 2>/dev/null | grep -q .; then
  ok "Sesión guardada en: $WA_SESSION"
else
  warn "Sin sesión guardada — necesitarás escanear QR al iniciar"
fi

# ── Espacio en disco para logs ────────────────────────────────────────────
echo -e "\n${BOLD}Logs${RESET}"
LOG_SIZE=$(du -sh logs/ 2>/dev/null | cut -f1 || echo "0")
info "Tamaño de logs: $LOG_SIZE"
LOG_COUNT=$(find logs/ -name "*.md" -o -name "*.log" 2>/dev/null | wc -l || echo "0")
info "Archivos de log: $LOG_COUNT"
if [[ $LOG_COUNT -gt 50 ]]; then
  warn "Muchos logs acumulados. Ejecuta: bash scripts/clean-logs.sh"
fi

echo -e "\n${BOLD}────────────────────────────────────────────${RESET}"
echo -e "Health check completado — $(date '+%H:%M:%S')"
echo -e "Para monitorización continua: ${CYAN}watch -n 30 bash scripts/health-check.sh${RESET}\n"
