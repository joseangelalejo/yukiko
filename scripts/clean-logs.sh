#!/usr/bin/env bash
# =============================================================================
# 🌨️  YUKIKO — Limpieza de logs y reportes
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo -e "🧹 Limpiando logs...\n"

LOG_DIR="$ROOT_DIR/logs"
REPORT_DIR="$LOG_DIR/reports"

# Contar antes
BEFORE=$(find "$LOG_DIR" -type f 2>/dev/null | wc -l)
SIZE_BEFORE=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)

# Eliminar reportes con más de 30 días
find "$REPORT_DIR" -name "*.md" -mtime +30 -delete 2>/dev/null || true
# Mantener últimos 20 reportes
ls -t "$REPORT_DIR"/*.md 2>/dev/null | tail -n +21 | xargs rm -f 2>/dev/null || true

# Rotar logs de pm2
pm2 flush 2>/dev/null && echo "  ✅ Logs de PM2 limpiados" || true

# Contar después
AFTER=$(find "$LOG_DIR" -type f 2>/dev/null | wc -l)
SIZE_AFTER=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)

echo "  Archivos: $BEFORE → $AFTER"
echo "  Tamaño:   $SIZE_BEFORE → $SIZE_AFTER"
echo -e "\n✅ Limpieza completada"
