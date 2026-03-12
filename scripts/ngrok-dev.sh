#!/usr/bin/env bash
# =============================================================================
# 🌨️  YUKIKO — ngrok tunnel (útil para webhooks en dev local)
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v ngrok &>/dev/null; then
  echo "ngrok no instalado. Instala con:"
  echo "  yay -S ngrok   o   paru -S ngrok"
  echo "  o descarga de https://ngrok.com/download"
  exit 1
fi

PORT="${1:-3000}"
echo -e "🌍 Abriendo tunnel ngrok → localhost:$PORT"
echo -e "   Copia la URL https:// en NEXTAUTH_URL y APP_URL de tu .env\n"
ngrok http "$PORT" --log stdout
