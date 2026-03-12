#!/usr/bin/env bash
# =============================================================================
# 🌨️  YUKIKO — Pre-push checks + informe
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REPORT_DIR="$ROOT_DIR/logs/reports"
mkdir -p "$REPORT_DIR"
REPORT_FILE="$REPORT_DIR/pre-push-$(date +%Y%m%d-%H%M%S).md"
START_TIME=$(date +%s)

PASS=0; FAIL=0; WARN=0

log()     { echo "$*" | tee -a "$REPORT_FILE"; }
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; log "- ℹ️  $*"; }
success() { echo -e "${GREEN}[PASS]${RESET}  $*"; log "- ✅ $*"; ((PASS++)) || true; }
fail()    { echo -e "${RED}[FAIL]${RESET}  $*"; log "- ❌ $*"; ((FAIL++)) || true; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; log "- ⚠️  $*"; ((WARN++)) || true; }
step()    { echo -e "\n${BOLD}${BLUE}▶ $*${RESET}"; log "\n## $*"; }

# ── Cabecera del informe ──────────────────────────────────────────────────────
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
COMMIT=$(git log --oneline -1 2>/dev/null || echo "none")
CHANGED_FILES=$(git diff --cached --name-only 2>/dev/null | wc -l || echo "?")

cat > "$REPORT_FILE" << EOF
# 🌨️ Yukiko — Informe Pre-Push
**Fecha:** $(date '+%Y-%m-%d %H:%M:%S')
**Rama:** $BRANCH
**Último commit:** $COMMIT
**Archivos en stage:** $CHANGED_FILES

EOF

echo -e "\n${BOLD}🌨️  Yukiko Pre-Push Report${RESET}"
echo -e "Rama: ${CYAN}$BRANCH${RESET} | Commit: ${CYAN}$COMMIT${RESET}\n"

# ── 1. Seguridad: no subir .env ───────────────────────────────────────────────
step "Seguridad"
if git diff --cached --name-only | grep -qE "^\.env$|^\.env\.local$"; then
  fail "¡.env en el stage! Elimínalo: git reset HEAD .env"
  echo -e "${RED}  ABORTANDO — no se puede subir el .env${RESET}"
  exit 1
else
  success "No hay archivos .env en el stage"
fi

# Buscar secrets hardcodeados
if git diff --cached | grep -qiE "(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|discord_token|api_key\s*=\s*['\"][^'\"\$]{10,})"; then
  fail "Posibles secrets hardcodeados detectados en el diff"
  warn "Revisa el output de: git diff --cached"
else
  success "No se detectaron secrets hardcodeados"
fi

# ── 2. TypeScript ──────────────────────────────────────────────────────────────
step "TypeScript type-check"
if npx tsc --noEmit -p tsconfig.base.json 2>> "$REPORT_FILE"; then
  success "TypeScript sin errores"
else
  fail "TypeScript encontró errores de tipos"
fi

# ── 3. ESLint ─────────────────────────────────────────────────────────────────
step "ESLint"
LINT_OUTPUT=$(npx eslint . --ext .ts,.tsx --format compact 2>&1 || true)
LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -c "error" || true)
LINT_WARNS=$(echo "$LINT_OUTPUT" | grep -c "warning" || true)

if [[ $LINT_ERRORS -gt 0 ]]; then
  fail "ESLint: $LINT_ERRORS errores, $LINT_WARNS avisos"
  echo "$LINT_OUTPUT" >> "$REPORT_FILE"
elif [[ $LINT_WARNS -gt 0 ]]; then
  warn "ESLint: 0 errores, $LINT_WARNS avisos"
else
  success "ESLint: sin errores ni avisos"
fi

# ── 4. Prettier ───────────────────────────────────────────────────────────────
step "Formato de código (Prettier)"
if npx prettier --check . --ignore-unknown 2>/dev/null; then
  success "Formato correcto"
else
  warn "Hay archivos sin formatear. Ejecuta: npx prettier --write ."
fi

# ── 5. Dependencias de seguridad ──────────────────────────────────────────────
step "Auditoría de seguridad (npm audit)"
AUDIT_OUTPUT=$(npm audit --audit-level=high 2>&1 || true)
if echo "$AUDIT_OUTPUT" | grep -q "found 0 vulnerabilities"; then
  success "Sin vulnerabilidades conocidas"
elif echo "$AUDIT_OUTPUT" | grep -qi "high\|critical"; then
  fail "Vulnerabilidades ALTAS o CRÍTICAS detectadas"
  echo "$AUDIT_OUTPUT" | tail -5 >> "$REPORT_FILE"
else
  warn "Vulnerabilidades bajas/medias detectadas (no bloquea)"
fi

# ── 6. Tamaño del repo ─────────────────────────────────────────────────────────
step "Tamaño de archivos"
LARGE_FILES=$(find . -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./.next/*" -size +500k -type f 2>/dev/null)
if [[ -n "$LARGE_FILES" ]]; then
  warn "Archivos grandes detectados (>500KB):"
  echo "$LARGE_FILES" | while read -r f; do
    SIZE=$(du -sh "$f" | cut -f1)
    warn "  $SIZE  $f"
    log "  - $SIZE $f"
  done
else
  success "Sin archivos grandes"
fi

# ── 7. Validar .env.example actualizado ────────────────────────────────────────
step "Consistencia de .env.example"
if [[ -f .env && -f .env.example ]]; then
  ENV_KEYS=$(grep -E "^[A-Z_]+=?" .env | cut -d= -f1 | sort)
  EXAMPLE_KEYS=$(grep -E "^[A-Z_]+=?" .env.example | cut -d= -f1 | sort)
  MISSING_IN_EXAMPLE=$(comm -23 <(echo "$ENV_KEYS") <(echo "$EXAMPLE_KEYS"))
  if [[ -n "$MISSING_IN_EXAMPLE" ]]; then
    warn "Variables en .env que no están en .env.example:"
    echo "$MISSING_IN_EXAMPLE" | while read -r k; do warn "  $k"; done
  else
    success ".env.example está sincronizado"
  fi
fi

# ── 8. Estadísticas del diff ──────────────────────────────────────────────────
step "Estadísticas del cambio"
DIFF_STATS=$(git diff --cached --stat 2>/dev/null || echo "Sin cambios en stage")
echo "$DIFF_STATS" | tee -a "$REPORT_FILE"

LINES_ADDED=$(git diff --cached --numstat 2>/dev/null | awk '{sum+=$1} END{print sum+0}')
LINES_REMOVED=$(git diff --cached --numstat 2>/dev/null | awk '{sum+=$2} END{print sum+0}')
info "+$LINES_ADDED líneas añadidas, -$LINES_REMOVED líneas eliminadas"
log "\n**+$LINES_ADDED añadidas, -$LINES_REMOVED eliminadas**"

# ── Resumen final ─────────────────────────────────────────────────────────────
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

cat >> "$REPORT_FILE" << EOF

---
## Resumen
| | Resultado |
|---|---|
| ✅ Passed | $PASS |
| ❌ Failed | $FAIL |
| ⚠️ Warnings | $WARN |
| ⏱️ Duración | ${DURATION}s |
EOF

echo -e "\n${BOLD}────────────────────────────────────────────${RESET}"
echo -e "  ${GREEN}✅ Passed:${RESET}   $PASS"
echo -e "  ${RED}❌ Failed:${RESET}   $FAIL"
echo -e "  ${YELLOW}⚠️  Warnings:${RESET} $WARN"
echo -e "  ⏱️  Duración:  ${DURATION}s"
echo -e "  📄 Informe:   ${CYAN}$REPORT_FILE${RESET}"
echo -e "${BOLD}────────────────────────────────────────────${RESET}\n"

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}${BOLD}❌ Pre-push FALLIDO — push bloqueado${RESET}\n"
  exit 1
else
  echo -e "${GREEN}${BOLD}✅ Pre-push OK — push permitido${RESET}\n"
  exit 0
fi
