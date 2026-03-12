#!/usr/bin/env bash
# =============================================================================
# 🌨️  YUKIKO — Backup de base de datos
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source .env 2>/dev/null || true

BACKUP_DIR="$ROOT_DIR/backups"
mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/yukiko-$DATE.sql"
LATEST_LINK="$BACKUP_DIR/latest.sql"

echo "💾 Iniciando backup de Neon DB..."

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL no configurado"
  exit 1
fi

pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null
ln -sf "$BACKUP_FILE" "$LATEST_LINK"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "✅ Backup completado: $BACKUP_FILE ($SIZE)"

# Limpiar backups viejos (mantener últimos 10)
ls -t "$BACKUP_DIR"/yukiko-*.sql 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
TOTAL=$(ls "$BACKUP_DIR"/yukiko-*.sql 2>/dev/null | wc -l)
echo "📦 Backups almacenados: $TOTAL (máx. 10)"
