#!/usr/bin/env bash
# =============================================================================
# 🌨️  YUKIKO — Post-pruebas locales: reporte y limpieza
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Recuperar test ID
TEST_ID=$(cat /tmp/yukiko-test-id 2>/dev/null || date +%Y%m%d-%H%M%S)
REPORT_DIR="$ROOT_DIR/logs/reports"
PRE_REPORT="$REPORT_DIR/pre-test-$TEST_ID.md"
POST_REPORT="$REPORT_DIR/post-test-$TEST_ID.md"
FULL_REPORT="$REPORT_DIR/test-full-$TEST_ID.md"

success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
fail()    { echo -e "${RED}[FAIL]${RESET}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
step()    { echo -e "\n${BOLD}${BLUE}▶ $*${RESET}"; }

echo -e "\n${BOLD}🌨️  Yukiko — Post-Test Report${RESET} (ID: $TEST_ID)\n"

cat > "$POST_REPORT" << EOF
# 🌨️ Yukiko — Post-Test Report
**ID:** $TEST_ID
**Fecha fin:** $(date '+%Y-%m-%d %H:%M:%S')

EOF

# ── 1. Métricas finales del sistema ───────────────────────────────────────────
step "Métricas finales del sistema"
CPU_FINAL=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d% -f1 2>/dev/null || echo "?")
MEM_FINAL=$(free -m | awk '/^Mem:/{print $3}')

info "CPU final: ${CPU_FINAL}%"
info "RAM final: ${MEM_FINAL}MB"

cat >> "$POST_REPORT" << EOF
## Métricas finales
| Métrica | Valor |
|---|---|
| CPU | ${CPU_FINAL}% |
| RAM usada | ${MEM_FINAL}MB |
EOF

# ── 2. Logs de error generados ─────────────────────────────────────────────────
step "Errores en logs"
ERROR_COUNT=0
for log_file in logs/*.log logs/discord-error.log logs/telegram-error.log logs/whatsapp-error.log; do
  if [[ -f "$log_file" ]]; then
    ERRS=$(grep -ci "error\|exception\|fatal\|unhandled" "$log_file" 2>/dev/null || true)
    if [[ "$ERRS" -gt 0 ]]; then
      warn "$log_file: $ERRS error(s)"
      ((ERROR_COUNT+=ERRS)) || true
      echo "### $log_file ($ERRS errores)" >> "$POST_REPORT"
      grep -i "error\|exception\|fatal" "$log_file" | tail -5 >> "$POST_REPORT" || true
    fi
  fi
done

if [[ $ERROR_COUNT -eq 0 ]]; then
  success "Sin errores en los logs"
  echo "- ✅ Sin errores en logs" >> "$POST_REPORT"
fi

# ── 3. Procesos zombies ────────────────────────────────────────────────────────
step "Limpieza de procesos"
ZOMBIES=$(ps aux | grep -E "Z.*yukiko" | grep -v grep | wc -l || true)
if [[ "$ZOMBIES" -gt 0 ]]; then
  warn "Se encontraron $ZOMBIES procesos zombie de Yukiko"
  ps aux | grep -E "Z.*yukiko" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true
  success "Procesos zombie eliminados"
else
  success "Sin procesos zombie"
fi

# ── 4. Restaurar .env original ────────────────────────────────────────────────
step "Restaurando entorno"
if [[ -f .env.backup ]]; then
  mv .env.backup .env
  success ".env original restaurado"
  echo "- ✅ .env restaurado" >> "$POST_REPORT"
fi

# Limpiar Redis
if systemctl is-active --quiet redis; then
  redis-cli FLUSHDB &>/dev/null && success "Redis limpiado post-test"
fi

# ── 5. Informe combinado ──────────────────────────────────────────────────────
step "Generando informe completo"
{
  echo "# 🌨️ Yukiko — Informe de Test Completo"
  echo "**ID:** $TEST_ID"
  echo "**Branch:** $(git branch --show-current)"
  echo "**Commit:** $(git log --oneline -1)"
  echo ""
  echo "---"
  echo ""
  if [[ -f "$PRE_REPORT" ]]; then
    cat "$PRE_REPORT"
    echo ""
    echo "---"
    echo ""
  fi
  cat "$POST_REPORT"
} > "$FULL_REPORT"

success "Informe completo: $FULL_REPORT"

# ── Resumen ───────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}────────────────────────────────────────────${RESET}"
echo -e "  ID del test:    ${CYAN}$TEST_ID${RESET}"
echo -e "  Errores en log: ${RED}$ERROR_COUNT${RESET}"
echo -e "  Informe:        ${CYAN}$FULL_REPORT${RESET}"
echo -e "${BOLD}────────────────────────────────────────────${RESET}\n"

rm -f /tmp/yukiko-test-id /tmp/yukiko-procs-before
