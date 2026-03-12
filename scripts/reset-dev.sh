#!/usr/bin/env bash
# =============================================================================
# 🌨️  YUKIKO — Reset limpio del entorno de desarrollo
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo -e "\n${BOLD}${RED}🌨️  Yukiko — Reset de entorno de desarrollo${RESET}\n"
echo -e "${YELLOW}⚠️  Esto eliminará node_modules, dist, .next y caché.${RESET}"
echo -e "Los archivos de sesión WhatsApp y .env NO se tocarán.\n"

read -rp "¿Continuar? (s/N): " CONFIRM
if [[ "${CONFIRM,,}" != "s" ]]; then
  echo "Cancelado."
  exit 0
fi

echo ""

# ── Detener procesos ───────────────────────────────────────────────────────
echo -e "${CYAN}Deteniendo procesos...${RESET}"
pm2 stop all 2>/dev/null && echo "  ✅ PM2 procesos detenidos" || echo "  ○ PM2 no activo"
pkill -f "tsx.*platforms" 2>/dev/null && echo "  ✅ Procesos tsx detenidos" || echo "  ○ Sin procesos tsx"

# ── Limpiar caché y builds ─────────────────────────────────────────────────
echo -e "${CYAN}Limpiando builds y caché...${RESET}"
rm -rf node_modules/ && echo "  ✅ node_modules eliminado"
rm -rf .next/ && echo "  ✅ .next eliminado"
rm -rf dist/ */dist/ && echo "  ✅ dist eliminado"
rm -rf web/.next/ && echo "  ✅ web/.next eliminado"
find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete 2>/dev/null && echo "  ✅ tsbuildinfo eliminado"

# Caché de npm
npm cache clean --force 2>/dev/null && echo "  ✅ npm cache limpiada"

# ── Redis flush ────────────────────────────────────────────────────────────
if systemctl is-active --quiet redis; then
  redis-cli FLUSHALL &>/dev/null && echo "  ✅ Redis vaciado"
fi

# ── Reinstalar dependencias ────────────────────────────────────────────────
echo -e "\n${CYAN}Reinstalando dependencias...${RESET}"
npm install && echo "  ✅ Dependencias instaladas"

# ── Verificar entorno ──────────────────────────────────────────────────────
echo -e "\n${CYAN}Verificando entorno...${RESET}"
bash scripts/env-validator.sh || true

echo -e "\n${GREEN}${BOLD}✅ Reset completo${RESET}"
echo -e "Inicia el entorno con: ${CYAN}bash scripts/dev.sh${RESET}\n"
