#!/usr/bin/env bash
# =============================================================================
# 🌨️  YUKIKO — Pre-pruebas locales
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REPORT_DIR="$ROOT_DIR/logs/reports"
mkdir -p "$REPORT_DIR"
TEST_ID="$(date +%Y%m%d-%H%M%S)"
REPORT_FILE="$REPORT_DIR/pre-test-$TEST_ID.md"

# Guardar test ID para que post-test lo use
echo "$TEST_ID" > /tmp/yukiko-test-id

success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
fail()    { echo -e "${RED}[FAIL]${RESET}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
step()    { echo -e "\n${BOLD}${BLUE}▶ $*${RESET}"; }

echo -e "\n${BOLD}🌨️  Yukiko — Pre-Test Setup${RESET} (ID: $TEST_ID)\n"

cat > "$REPORT_FILE" << EOF
# 🌨️ Yukiko — Pre-Test Report
**ID:** $TEST_ID
**Fecha:** $(date '+%Y-%m-%d %H:%M:%S')
**Rama:** $(git branch --show-current)

EOF

# ── 1. Usar .env de test ──────────────────────────────────────────────────────
step "Preparando entorno de test"
if [[ -f .env.test ]]; then
  cp .env .env.backup 2>/dev/null || true
  cp .env.test .env
  success "Usando .env.test"
  echo "- ✅ Usando .env.test" >> "$REPORT_FILE"
else
  warn ".env.test no existe. Usando .env de producción (no recomendado)"
  echo "- ⚠️ Sin .env.test — usando .env" >> "$REPORT_FILE"
  info "Crea .env.test con: DATABASE_URL apuntando a una BD de test"
fi

# ── 2. Redis de test ──────────────────────────────────────────────────────────
step "Servicios de test"
if systemctl is-active --quiet redis; then
  redis-cli FLUSHDB &>/dev/null && success "Redis: caché limpiada para tests"
  echo "- ✅ Redis limpiado" >> "$REPORT_FILE"
else
  warn "Redis no disponible"
fi

# ── 3. Snapshot de BD actual ───────────────────────────────────────────────────
step "Snapshot pre-test de la base de datos"
source .env 2>/dev/null || true
if [[ -n "${DATABASE_URL:-}" && "$DATABASE_URL" != *"xxxx"* ]]; then
  SNAPSHOT_FILE="$ROOT_DIR/backups/pre-test-$TEST_ID.sql"
  pg_dump "$DATABASE_URL" > "$SNAPSHOT_FILE" 2>/dev/null && \
    success "Snapshot guardado: $SNAPSHOT_FILE" || \
    warn "No se pudo hacer snapshot (pg_dump no disponible o BD no accesible)"
  echo "- ✅ Snapshot: $SNAPSHOT_FILE" >> "$REPORT_FILE"
fi

# ── 4. Estado inicial del sistema ─────────────────────────────────────────────
step "Métricas del sistema (baseline)"
CPU_BASELINE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d% -f1 2>/dev/null || echo "?")
MEM_BASELINE=$(free -m | awk '/^Mem:/{print $3}')
DISK_FREE=$(df -h . | awk 'NR==2{print $4}')

info "CPU inicial: ${CPU_BASELINE}%"
info "RAM inicial: ${MEM_BASELINE}MB usados"
info "Disco libre: $DISK_FREE"

cat >> "$REPORT_FILE" << EOF

## Métricas baseline
| Métrica | Valor |
|---|---|
| CPU | ${CPU_BASELINE}% |
| RAM usada | ${MEM_BASELINE}MB |
| Disco libre | $DISK_FREE |
EOF

# ── 5. Guardar PIDs activos ───────────────────────────────────────────────────
step "Registrando procesos activos"
ps aux | grep -E "discord|telegram|whatsapp|next" | grep -v grep > /tmp/yukiko-procs-before || true
success "Procesos registrados"

echo -e "\n${GREEN}${BOLD}✅ Entorno de test listo${RESET}"
echo -e "   ID del test: ${CYAN}$TEST_ID${RESET}"
echo -e "   Ejecuta tus pruebas y luego: ${CYAN}bash scripts/post-test.sh${RESET}\n"
