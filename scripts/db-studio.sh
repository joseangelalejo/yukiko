#!/usr/bin/env bash
# =============================================================================
# 🌨️  YUKIKO — Drizzle Studio (inspector visual de BD)
# =============================================================================
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
echo "🔍 Abriendo Drizzle Studio en http://local.drizzle.studio ..."
npx drizzle-kit studio
