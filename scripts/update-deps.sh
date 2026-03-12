#!/usr/bin/env bash
# =============================================================================
# 🌨️  YUKIKO — Actualizar dependencias de forma segura
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo -e "\n${BOLD}🌨️  Actualizando dependencias de forma segura${RESET}\n"

# Snapshot del package-lock.json
cp package-lock.json "backups/package-lock-$(date +%Y%m%d).json" 2>/dev/null || true

# Ver desactualizadas
echo -e "${BOLD}Dependencias desactualizadas:${RESET}"
npm outdated --depth=0 2>/dev/null || true
echo ""

read -rp "¿Actualizar solo parches y menores (recomendado)? (s/N): " CONFIRM
if [[ "${CONFIRM,,}" != "s" ]]; then
  echo "Cancelado."
  exit 0
fi

# Actualizar solo minor/patch (seguro)
npx npm-check-updates -u --target minor 2>/dev/null || true
npm install

echo -e "\n${CYAN}Verificando que todo funciona tras la actualización...${RESET}"
npx tsc --noEmit -p tsconfig.base.json && echo -e "${GREEN}✅ TypeScript OK${RESET}" || echo -e "${RED}❌ Errores de tipos tras actualización${RESET}"

npm audit --audit-level=high 2>&1 | tail -3

echo -e "\n${GREEN}✅ Actualización completada${RESET}"
echo -e "Haz ${CYAN}git diff package.json${RESET} para ver los cambios"
